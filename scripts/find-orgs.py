# coding=UTF-8

import sys
sys.path.append("..")
import csv
import json
import re
from nltk import metrics

candidate_to_slug_mapping = {
    'Clarke': 'darrell-clarke',
    'Squilla': 'mark-squilla',
    'Johnson': 'kenyatta-johnson',
    'Blackwell': 'jannie-blackwell',
    'Jones': 'curtis-jones',
    'Henon': 'bobby-henon',
    'Bobby': 'bobby-henon',  # Henon's org is called Bobby 11 or Bobby II
    'Sanchez': 'maria-quinones-sanchez',
    'Sánchez': 'maria-quinones-sanchez',
    'Bass': 'cindy-bass',
    'Tasco': 'marian-tasco',
    'O\'Neill': 'brian-oneill',
    'Goode': 'wilson-goode',
    'Greenlee': 'bill-greenlee',
    'Green': 'bill-green',
    'O\'Brien': 'dennis-obrien',
    'Kenney': 'jim-kenney',
    'Brown': 'blondell-reynolds-brown',
    'Oh': 'david-oh'
}

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

            # Not that great, not using for now
            # Look for a word in the org's name that is simliar to Candidates' name.
            # i.e. Clark is close to Clarke
            #parts = row[0].split(' ')
            #for part in parts:
            #    if (metrics.edit_distance(part, candidate) <= 2 and
            #        row[0].strip() not in candidates[candidate]):
            #            candidates[candidate].append(row[0].strip())


output = []

for name, orgs in candidates.items():
    for org in orgs:
        output.append({org: candidate_to_slug_mapping[name]})

with open('../data/pac_to_candidate.json', 'w') as outfile:
  json.dump(output, outfile, indent=2, sort_keys=True)
