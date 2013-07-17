# coding=UTF-8

import sys
sys.path.append("..")
import csv
import json
import re
from nltk import metrics

candidates = {
    'Clarke': [],
    'Squilla': [],
    'Johnson': [],
    'Blackwell': [],
    'Jones': [],
    'Henon': [],
    'Bobby': [],  # Henon's org is called Bobby 11 or Bobby II
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

            # Look for Candidates' name, ignore case
            if (re.search(r'(?i)' + candidate, row[0], re.IGNORECASE) is not None and
                row[0].strip() not in candidates[candidate]):
                    candidates[candidate].append(row[0].strip())

            # Look for a word in the org's name that is simliar to Candidates' name.
            # i.e. Clark is close to Clarke
            parts = row[0].split(' ')
            for part in parts:
                if (metrics.edit_distance(part, candidate) <= 2 and
                    row[0].strip() not in candidates[candidate]):
                        candidates[candidate].append(row[0].strip())


print json.dumps(candidates)
