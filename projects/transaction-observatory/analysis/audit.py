"""Audit the full generated panel or a caller-supplied CSV with SQLite.

python analysis/audit.py [transactions.csv]
The CSV schema is customer_id,day,category,amount. Never use raw card numbers.
"""
import json
import sqlite3
import sys
from pathlib import Path
import pandas as pd
import numpy as np
from build import generate

def main():
    tx=pd.read_csv(sys.argv[1]) if len(sys.argv)>1 else generate()
    required={'customer_id','day','category','amount'}
    if required-set(tx.columns):
        raise ValueError('Missing required columns: '+', '.join(sorted(required-set(tx.columns))))
    for col in required: tx[col]=pd.to_numeric(tx[col],errors='coerce').replace([np.inf,-np.inf],np.nan)
    with sqlite3.connect(':memory:') as db:
        tx.to_sql('transactions',db,index=False)
        statements=Path(__file__).with_name('audit.sql').read_text().split(';')
        for statement in statements:
            if statement.strip():
                frame=pd.read_sql_query(statement,db)
                print(frame.to_json(orient='records',indent=2))

if __name__=='__main__': main()
