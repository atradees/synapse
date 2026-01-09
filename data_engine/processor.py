import pandas as pd
import numpy as np
import json
import os
import yfinance as yf
import networkx as nx
import community as community_louvain
from sklearn.covariance import LedoitWolf
from sklearn.decomposition import PCA
from sentence_transformers import SentenceTransformer, util
from datetime import datetime
import warnings

warnings.filterwarnings("ignore")

# --- CONFIG ---
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
INSTRUMENTS_JSON = os.path.join(DATA_DIR, 'instruments_list.json')
LOGIC_MATRIX_JSON = os.path.join(DATA_DIR, 'logic_matrix.json')
OUTPUT_JSON = os.path.abspath(os.path.join(DATA_DIR, '..', 'web', 'public', 'data', 'brain_data.json'))

TIMEFRAMES = {"1W": 5, "1M": 21, "3M": 63, "1Y": 252}
ALPHA, BETA, GAMMA = 0.4, 0.3, 0.3

def safe_float(val):
    try:
        if pd.isna(val) or np.isnan(val) or np.isinf(val): return 0.0
        return float(val)
    except: return 0.0

class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer): return int(obj)
        if isinstance(obj, np.floating): return safe_float(obj)
        if isinstance(obj, np.ndarray): return obj.tolist()
        return super(NpEncoder, self).default(obj)

def load_data_sources():
    with open(INSTRUMENTS_JSON, 'r') as f: instr = json.load(f)
    tickers, meta = [], {}
    items = [i for cat in instr.values() for i in cat] if isinstance(instr, dict) else instr
    for i in items:
        tickers.append(i['ticker'])
        meta[i['ticker']] = i
    
    logic_rules = {}
    if os.path.exists(LOGIC_MATRIX_JSON):
        with open(LOGIC_MATRIX_JSON, 'r') as f: logic_rules = json.load(f)
    return list(set(tickers)), meta, logic_rules

def calculate_quant_metrics(df, lookback):
    log_returns = np.log(df / df.shift(1)).fillna(0)
    
    # 1. Dynamic Returns
    rolling_ret = log_returns.rolling(lookback).sum()
    dynamic_return = rolling_ret.iloc[-1].fillna(0)

    # 2. Z-Score
    long_window = 252
    mu = log_returns.rolling(long_window).mean()
    sigma = log_returns.rolling(long_window).std()
    sigma_safe = sigma.iloc[-1].replace(0, 0.01).fillna(0.01)
    current_ret = log_returns.iloc[-1].fillna(0)
    z_score = (current_ret - mu.iloc[-1].fillna(0)) / sigma_safe

    # 3. Participation
    try:
        clean_ret = log_returns.tail(lookback + 30).dropna(axis=1)
        if clean_ret.empty: participation = pd.Series(0, index=df.columns)
        else:
            corr = clean_ret.corr().fillna(0)
            G_corr = nx.from_pandas_adjacency(corr.abs())
            participation = pd.Series(nx.eigenvector_centrality_numpy(G_corr, weight='weight'))
    except: participation = pd.Series(0, index=df.columns)

    # 4. Influence
    influence = {}
    try:
        clean_data = log_returns.tail(lookback + 30).dropna(axis=1)
        if not clean_data.empty:
            pca = PCA(n_components=1)
            market_mode = pca.fit_transform(clean_data).flatten()
            var_market = np.var(market_mode)
            if var_market > 1e-6:
                for asset in clean_data.columns:
                    r = clean_data[asset].values
                    if len(r) == len(market_mode):
                        cov = np.cov(r, market_mode)[0, 1]
                        influence[asset] = cov / var_market
                    else: influence[asset] = 0.0
            else:
                for c in df.columns: influence[c] = 0.0
    except: 
        for c in df.columns: influence[c] = 0.0
    
    return dynamic_return, z_score, participation, pd.Series(influence)

def compute_hybrid_matrix(returns_df, semantic_df, metadata, logic_rules):
    valid_cols = returns_df.columns[returns_df.std() > 1e-6]
    returns_df = returns_df[valid_cols]
    semantic_df = semantic_df.loc[valid_cols, valid_cols]

    if returns_df.empty: return pd.DataFrame()

    pearson = returns_df.corr().fillna(0)
    common = returns_df.columns.intersection(semantic_df.columns)
    magnitude = (ALPHA * pearson.loc[common, common].abs()) + \
                (GAMMA * semantic_df.loc[common, common])

    for i, c1 in enumerate(magnitude.columns):
        for j, c2 in enumerate(magnitude.columns):
            if i >= j: continue
            g1, g2 = metadata[c1]['group'], metadata[c2]['group']
            ai_score = logic_rules.get(g1, {}).get(g2, 0.0)
            if ai_score < -0.3: magnitude.iloc[i, j] *= 0.1 
            elif ai_score > 0.4: magnitude.iloc[i, j] *= 1.3

    signs = np.sign(pearson.loc[common, common])
    return (magnitude * signs).fillna(0)

def generate_snapshot(df, lookback_days, metadata, semantic_df, logic_rules):
    dyn_ret, z_scores, participation, influence = calculate_quant_metrics(df, lookback_days)
    
    subset = df.tail(lookback_days + 30)
    returns = subset.pct_change().replace([np.inf, -np.inf], 0).fillna(0)
    hybrid = compute_hybrid_matrix(returns, semantic_df, metadata, logic_rules)
    
    if hybrid.empty: return {"nodes": [], "links": [], "global": {}}

    G = nx.Graph()
    for i in range(len(hybrid.columns)):
        for j in range(i+1, len(hybrid.columns)):
            val = hybrid.iloc[i,j]
            if abs(val) > 0.25: 
                G.add_edge(hybrid.columns[i], hybrid.columns[j], weight=safe_float(val))

    # --- SKELETON CALCULATION (MST) ---
    # Kita cari Maximum Spanning Tree karena bobot = korelasi (kekuatan)
    # Semakin kuat korelasi, semakin penting edge-nya.
    try:
        # Copy graph untuk perhitungan MST
        G_mst = G.copy()
        # Pastikan bobot absolut untuk MST
        for u, v, d in G_mst.edges(data=True): d['weight'] = abs(d['weight'])
        
        # Hitung Maximum Spanning Tree
        skeleton_graph = nx.maximum_spanning_tree(G_mst)
        skeleton_edges = set(frozenset((u, v)) for u, v in skeleton_graph.edges())
    except:
        skeleton_edges = set()

    try: 
        G_abs = G.copy()
        for u, v, d in G_abs.edges(data=True): d['weight'] = abs(d['weight'])
        pr = nx.pagerank(G_abs, weight='weight')
        part = community_louvain.best_partition(G_abs)
    except: 
        pr, part = {}, {}

    nodes = []
    try: last_price = df.iloc[-1]
    except: last_price = pd.Series()

    for t in hybrid.columns:
        display_change = (np.exp(dyn_ret.get(t, 0)) - 1) * 100
        power_val = participation.get(t, 0)
        if power_val == 0: power_val = pr.get(t, 0)
        inf_val = influence.get(t, 0)

        nodes.append({
            "id": t, 
            "name": metadata[t]['name'], 
            "group": metadata[t]['group'],
            "ticker": t,
            "power": safe_float(power_val), 
            "community": int(part.get(t, 0)),
            "zScore": round(safe_float(z_scores.get(t, 0)), 2),
            "periodChange": round(safe_float(display_change), 2),
            "influence": round(safe_float(inf_val), 3),
            "price": round(safe_float(last_price.get(t, 0)), 2)
        })

    # Inject isSkeleton Flag
    links = []
    for u, v, d in G.edges(data=True):
        is_skel = frozenset((u, v)) in skeleton_edges
        links.append({
            "source": u, 
            "target": v, 
            "value": round(safe_float(d['weight']), 4),
            "isSkeleton": is_skel # <--- INI KUNCINYA
        })

    avg_stress = np.mean([abs(l['value']) for l in links]) if links else 0

    return {
        "nodes": nodes, "links": links, 
        "global": { 
            "system_stress": round(safe_float(avg_stress * 100), 1), 
            "regime": "ANALYSIS_READY",
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M UTC")
        }
    }

def run_processor():
    print("==========================================")
    print("   SYNAPSE ENGINE v28.0 [SKELETON FIX]    ")
    print("==========================================")
    tickers, metadata, logic_rules = load_data_sources()
    
    df = yf.download(tickers, period="2y", group_by='column', threads=True, auto_adjust=True)
    try:
        if isinstance(df.columns, pd.MultiIndex): df = df['Close']
    except: pass

    df = df.ffill().bfill().dropna(axis=1, how='all')
    
    print("[*] Computing Semantic ML...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    names = [metadata[t]['name'] + " " + metadata[t]['group'] for t in df.columns]
    embs = model.encode(names)
    semantic_df = pd.DataFrame(util.cos_sim(embs, embs).numpy(), index=df.columns, columns=df.columns)

    results = {"timeframes": {}}
    for name, days in TIMEFRAMES.items():
        print(f"   > Processing {name}...")
        results["timeframes"][name] = generate_snapshot(df, days, metadata, semantic_df, logic_rules)
    
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, 'w') as f: json.dump(results, f, cls=NpEncoder)
    print(f"[SUCCESS] Skeleton & Metrics Calculated. Nodes: {len(df.columns)}")

if __name__ == "__main__": run_processor()