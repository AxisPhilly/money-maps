# coding=UTF-8

import sys
sys.path.append("..")
import csv
import json
import re

candidates = {
    'Clarke': [],
    'Squilla': [],
    'Johnson': [],
    'Blackwell': [],
    'Jones': [],
    'Henon': [],
    'Bobby': [], # Henon's org is called Bobby 11 or Bobby II
    'Sanchez': [],
    'Sánchez': [],
    'Bass': [],
    'Tasco': [],
    'O\'Neill': [],
    'Goode': [],
    'Greenlee': [],
    'Green': [],
    'O\'Brien': [],
    'Kenney': [],
    'Brown': [],
    'Oh': []
}

with open('../data/composite.txt', 'r') as f:
    reader = csv.reader(f, delimiter='\t', quotechar="\"")
    for row in reader:
        for candidate in candidates.keys():
            if re.search(r'(?i)' + candidate, row[0], re.IGNORECASE) is not None and \
             row[0].strip() not in candidates[candidate]:
                candidates[candidate].append(row[0].strip())

print json.dumps(candidates)
