"""Reproducible synthetic transaction benchmark. Run from the repository root."""
from pathlib import Path
import json
import numpy as np
import pandas as pd
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import roc_auc_score, average_precision_score, brier_score_loss

ROOT = Path(__file__).resolve().parents[1]
SEED = 1724867
CATEGORIES = ['Groceries', 'Dining', 'Retail', 'Travel']

def generate(n=1200, days=300, seed=SEED):
    rng = np.random.default_rng(seed)
    rates = rng.uniform(.12, .9, n)
    wallets = rng.lognormal(3.3, .5, n)
    exits = rng.integers(100, days + 180, n)
    exits[rng.random(n) < .55] = days + 200
    rows = []
    for day in range(days):
        trend = 1 + .0007 * day
        seasonal = 1 + .16 * np.sin(2 * np.pi * day / 7)
        decay = np.clip((exits - day) / 40, 0, 1)
        counts = rng.poisson(rates * seasonal * decay)
        ids = np.repeat(np.arange(n), counts)
        cats = rng.choice(4, len(ids), p=[.38,.29,.25,.08])
        amounts = rng.lognormal(np.log(wallets[ids]), .55) * np.array([1,.65,1.5,4])[cats] * trend
        rows.extend(zip(ids.tolist(), [day]*len(ids), cats.tolist(), np.round(amounts,2).tolist()))
    return pd.DataFrame(rows, columns=['customer_id','day','category','amount'])

def features(tx, cutoff, n=1200):
    """Predict next-30-day inactivity from transactions strictly before cutoff."""
    history = tx[tx.day < cutoff]
    ids = pd.Index(range(n), name='customer_id')
    f = pd.DataFrame(index=ids)
    for window in (30,60,90):
        recent = history[history.day >= cutoff-window].groupby('customer_id').amount
        f[f'count_{window}'] = recent.count().reindex(ids, fill_value=0)
        f[f'spend_{window}'] = recent.sum().reindex(ids, fill_value=0)
    f['recency'] = cutoff - history.groupby('customer_id').day.max().reindex(ids, fill_value=cutoff-91)
    f['frequency_change'] = f.count_30 - (f.count_60-f.count_30)
    eligible = f.count_90 > 0
    return f[eligible]

def labels(tx, cutoff, ids):
    future = tx[(tx.day >= cutoff) & (tx.day < cutoff+30)]
    active = set(future.customer_id)
    return np.array([int(i not in active) for i in ids])

def forecast(series, cutoff, horizon=28):
    """Frozen 28-day forecast: trend + weekday, fit on trailing 84 days."""
    def design(days):
        days = np.asarray(days)
        return np.column_stack([days-cutoff, np.eye(7)[days % 7]])
    train_days = np.arange(cutoff-84, cutoff)
    future_days = np.arange(cutoff, cutoff+horizon)
    model = Ridge(alpha=1).fit(design(train_days), series[train_days])
    pred = np.clip(model.predict(design(future_days)), 0, None)
    baseline = np.tile(series[cutoff-7:cutoff], (horizon+6)//7)[:horizon]
    return pred, baseline

def build():
    tx = generate()
    # Label windows [150,180) end before validation cutoff 210;
    # validation [210,240) ends before final test cutoff 270.
    train, valid, test = [features(tx,c) for c in (150,210,270)]
    ys = [labels(tx,c,x.index) for c,x in zip((150,210,270),(train,valid,test))]
    model = make_pipeline(StandardScaler(), LogisticRegression(C=.3,max_iter=2000,random_state=SEED))
    model.fit(train,ys[0])
    vp = model.predict_proba(valid)[:,1]
    # Preselect the screening threshold on validation, then lock for test.
    thresholds = np.arange(.1,.81,.05)
    def f1(t):
        sel=vp>=t; tp=np.sum(sel & (ys[1]==1))
        return 2*tp/max(1,np.sum(sel)+np.sum(ys[1]))
    threshold = float(max(thresholds,key=f1))
    scores = model.predict_proba(test)[:,1]
    baseline = np.full(len(test), ys[0].mean())
    top = np.argsort(scores)[-max(1,int(.1*len(scores))):]
    risk = {'auc':roc_auc_score(ys[2],scores),'average_precision':average_precision_score(ys[2],scores),
        'brier':brier_score_loss(ys[2],scores),'baseline_brier':brier_score_loss(ys[2],baseline),
        'prevalence':float(ys[2].mean()),'top_decile_lift':float(ys[2][top].mean()/ys[2].mean()),
        'threshold':threshold,'customers':len(test),'label':'No transactions in the next 30 days'}
    calibration=[]
    for lo in np.arange(0,1,.2):
        m=(scores>=lo)&(scores<lo+.2)
        if m.any(): calibration.append({'predicted':float(scores[m].mean()),'observed':float(ys[2][m].mean()),'n':int(m.sum())})
    series_out={}
    for name, subset in [('All categories',tx)]+[(c,tx[tx.category==i]) for i,c in enumerate(CATEGORIES)]:
        daily=subset.groupby('day').amount.sum().reindex(range(300),fill_value=0).values
        folds=[]
        for cutoff in (188,216,244,272):
            pred,base=forecast(daily,cutoff)
            actual=daily[cutoff:cutoff+28]
            wape=lambda p:float(np.abs(actual-p).sum()/actual.sum())
            folds.append({'cutoff':cutoff,'model_wape':wape(pred),'baseline_wape':wape(base)})
        pred,base=forecast(daily,272)
        # Band calibrated on prior disjoint backtest residuals, not the final period.
        residuals=[]
        for c in (188,216,244):
            p,_=forecast(daily,c); residuals.extend(np.abs(daily[c:c+28]-p))
        width=float(np.quantile(residuals,.9))
        coverage=float(np.mean(np.abs(daily[272:300]-pred)<=width))
        series_out[name]={'daily':np.round(daily,2).tolist(),'prediction':np.round(pred,2).tolist(),
            'baseline':np.round(base,2).tolist(),'band_width':width,'coverage':coverage,'folds':folds}
    customers=[]
    for k,(cid,row) in enumerate(test.iterrows()):
        customers.append({'id':f'SYN-{cid:04d}','risk':round(float(scores[k]),5),
            'recency':int(row.recency),'spend':round(float(row.spend_30),2),'count':int(row.count_30),'actual':int(ys[2][k])})
    # Separate randomized, synthetic experiment. Never identify churn risk as treatment effect.
    rng=np.random.default_rng(SEED+1)
    treatment=rng.binomial(1,.5,2000)
    control_mean=rng.lognormal(4,.65,2000)
    outcomes=control_mean+8*treatment+rng.normal(0,20,2000)
    a=outcomes[treatment==1];b=outcomes[treatment==0]
    ate=float(a.mean()-b.mean());se=float(np.sqrt(a.var(ddof=1)/len(a)+b.var(ddof=1)/len(b)))
    experiment={'n':2000,'treated':len(a),'control':len(b),'ate':ate,'lower':ate-1.96*se,'upper':ate+1.96*se,'true_effect':8}
    result={'seed':SEED,'start':'2025-01-01','days':300,'transactions':len(tx),'customers':1200,
        'risk':risk,'calibration':calibration,'series':series_out,'customer_scores':customers,'experiment':experiment}
    (ROOT/'dist'/'results.json').write_text(json.dumps(result,separators=(',',':'),allow_nan=False))
    (ROOT/'dist'/'results.js').write_text('window.BENCHMARK='+json.dumps(result,separators=(',',':'),allow_nan=False)+';\n')
    tx.head(2500).to_csv(ROOT/'dist'/'synthetic-sample.csv',index=False)
    print(json.dumps({'transactions':len(tx),'risk':risk,'forecast':series_out['All categories']['folds'],'experiment':experiment},indent=2))
    return result

if __name__=='__main__': build()
