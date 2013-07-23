import csv
import requests
import re

f = open("data/composite.txt")
csvfile = csv.reader(f, delimiter='\t', quotechar='"')

next(csvfile)

states_list = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "DC": "District of Columbia",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming"
}

states_list_reverse = {}

for key, value in states_list.iteritems():
    states_list_reverse[value] = key

campaign_list = {
    "Friends of Jannie L. Blackwell": "jannie-blackwell",
    "Friends of jannie L. Blackwell": "jannie-blackwell",
    "Friends of jannie L. blackwell": "jannie-blackwell",
    "FRIENDS OF JANNIE L. BLACKWELL": "jannie-blackwell",
    "Friends Of Jannie L. Blackwell": "jannie-blackwell",
    "Exploratory Committee to Elect Curtis Jones": "curtis-jones",
    "FRIENDS OF CURTIS JONES, JR.": "curtis-jones",
    "Friends of Curtis Jones, Jr.": "curtis-jones",
    "Friends of Curtis Jones,Jr.": "curtis-jones",
    "Curtis Jones, Jr.": "curtis-jones",
    "Exporatory Committee To Elect Curtis Jones, Jr.": "curtis-jones",
    "Friends of Curtis Jones, Jr": "curtis-jones",
    "Friends of Cindy Bass": "cindy-bass",
    "Cindy Bass": "cindy-bass",
    "Friends of Kenyatta Johnson": "kenyatta-johnson",
    "Citizens For Kenyatta Johnson": "kenyatta-johnson",
    "Friends of Darrell L. Clarke": "darrell-clarke",
    "Darrell L. Clarke": "darrell-clarke",
    "Freinds Of darell L. Clarke": "darrell-clarke",
    "Freinds of Darrell L. Clarke": "darrell-clarke",
    "Friends of Darrell L Clarke": "darrell-clarke",
    "Friends of Darrell Clarke": "darrell-clarke",
    "Bobby 11": "bobby-henon",
    "FRIENDS OF BLONDELL REYNOLDS BROWN": "blondell-reynolds-brown",
    "Friends of Blondell Reynolds Brown": "blondell-reynolds-brown",
    "Friends of Blondell Reynolds-Brown": "blondell-reynolds-brown",
    "FRIENDS OF KENNEY DICICCO": "jim-kenney",
    "Kenney for Council Committee": "jim-kenney",
    "Kenney for Council": "jim-kenney",
    "Kenney For Council": "jim-kenney",
    "Friends of Brian O'Neill": "brian-oneill",
    "Friends Of Brian O'Neill": "brian-oneill",
    "PHILADELPHIANS FOR GREEN": "bill-green",
    "Greenlee for Council-At-Large": "bill-greenlee",
    "Philadelphians for Green": "bill-green",
    "Green for Philadelphia": "bill-green",
    "Bill Green": "bill-green",
    "philadelphians for green": "bill-green",
    "W. Wilson Goode, Jr.": "wilson-goode",
    "FRIENDS OF DENNY O'BRIEN": "dennis-obrien",
    "Denny O'Brien for Philadelphia": "dennis-obrien",
    "Friends of Denny O'Brien": "dennis-obrien",
    "Dennis M. O'Brien": "dennis-obrien",
    "CITIZENS FOR DAVID OH": "david-oh",
    "DAVID OH": "david-oh",
    "DAVID H. OH": "david-oh",
    "Citizens for David Oh": "david-oh",
    "David Oh": "david-oh",
    "Maria D. Quinones Sanchez": "maria-quinones-sanchez",
    "Maria Quinones Sanchez": "maria-quinones-sanchez",
    "Maria Quinones-Sanchez": "maria-quinones-sanchez",
    "Committee to Elect Mark Squilla": "mark-squilla",
    "SQUILLA FOR COUNCIL": "mark-squilla",
    "Squilla for Council": "mark-squilla",
    "Friends of Marian B Tasco": "marian-tasco",
    "FRIENDS OF MARIAN B TASCO": "marian-tasco",
    "MARIAN B TASCO": "marian-tasco",
    "Greenlee for Council-at-Large": "bill-greenlee",
    "William K. Greenlee": "bill-greenlee"
}

candidates = {}

def state_to_two_letter(state):
    try:
        states_list[state]
        return state
    except KeyError:
        try:
            states_list_reverse[state]
            return states_list_reverse[state]
        except KeyError:
            return state


def is_non_pa_state(states_list, state):
    if state == "PA":
        return False
    else:
        try:
            states_list[state]
            return True
        except KeyError:
            return False


def get_candidate_slug(campaign, campaign_list):
    try:
        return campaign_list[campaign]
    except KeyError:
        return None


def in_united_states(country):
    return country == "United States"


def new_jersey_address_shift(zipcode, address):
    if len(zipcode) >= 5:
        return address+" "+row[9][0:5]
    else:
        return address


def record_bad_address(row):
    with open('bad_address_list.csv', 'a') as csvfile:
        write = csv.writer(csvfile, delimiter='|')
        write.writerow([row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7],
                        row[8], row[9], row[10], row[11], row[12], row[13], row[14],
                        row[15], row[16], row[17], row[18], row[19], row[20], row[21], row[22], 'FALSE', 'FALSE'])

for row in csvfile:
    if len(row) > 3:
        if row[3] == "CFR - Schedule I - Part D - All Other Contributions (Over $250.00)" or row[3] == "CFR - Schedule I - Part A - Contributions Received From Political Committees ($50.01 to $250.00)" or row[3] == "CFR - Schedule I - Part B - All Other Contributions ($50.01 - $250.00)" or row[3] == "CFR - Schedule I - Part C - Contributions Received From Political Committees (Over $250.00)":
            # fix mispelling
            if row[7] == "PHILADELHIA" or "Phila." or "Phila" or "phila" or "PHILA" or "PHILA.":
                row[7] == "Philadelphia"
            address = re.sub(r'[^\w]', ' ', row[5]+" "+row[6]+" "+row[7]+" "+row[8])
            if row[8] == "NJ":
                address = new_jersey_address_shift(row[9], address)
            campaign = row[0]
            year = row[1]
            try:
                amount = float(row[18])
            except ValueError:
                pass
            city, state, county = "", "", ""
            candidate = get_candidate_slug(campaign, campaign_list)
            if candidate:
                r = requests.get('http://localhost:8080/maps/api/geocode/json?sensor=false%20&address='+address)
                if row[20] != "Y":
                    if (len(r.json()['results']) > 0):
                        s = r.json()['results'][0]['geometry']['location']
                        lon, lat = str(s['lng']), str(s['lat'])
                        r = requests.get('http://localhost:8080/coordinates2politics/'+lat+','+lon)
                        s = r.json()[0]['politics']
                        state = state_to_two_letter(row[8])                    
                        if is_non_pa_state(states_list, state):
                            state = states_list[state]
                        else:
                            if s:
                                for each in s:
                                    try:
                                        if each['friendly_type'] == "county":
                                            county = each['name']
                                    except KeyError:
                                        pass
                                    try:
                                        if each['friendly_type'] == "country":
                                            country = each['name']
                                    except KeyError:
                                        pass                                
                                    try:
                                        if each['friendly_type'] == "city":
                                            city = each['name']
                                    except KeyError:
                                        pass
                                    try:
                                        if 'ward' in each:
                                            ward = each['ward']
                                    except KeyError:
                                        pass
                                    try:
                                        if each['friendly_type'] == "state":
                                            state = each['name']
                                    except KeyError:
                                        pass
                        if in_united_states(country):
                            if candidate not in candidates:
                                candidates[candidate] = {}
                            if year not in candidates[candidate]:
                                candidates[candidate][year] = {}
                            if 'state' not in candidates[candidate][year]:
                                candidates[candidate][year]['state'] = {}
                            if state not in candidates[candidate][year]['state']:
                                candidates[candidate][year]['state'][state] = amount
                            else:
                                candidates[candidate][year]['state'][state] += amount
                            if state == "Pennsylvania":
                                if 'county' not in candidates[candidate][year]:
                                    candidates[candidate][year]['county'] = {}
                                if county not in candidates[candidate][year]['county']:
                                    candidates[candidate][year]['county'][county] = amount
                                else:
                                    candidates[candidate][year]['county'][county] += amount
                                if city == "Philadelphia":
                                    if 'ward' not in candidates[candidate][year]:
                                        candidates[candidate][year]['ward'] = {}
                                    if ward not in candidates[candidate][year]['ward']:
                                        candidates[candidate][year]['ward'][ward] = amount
                                    else:
                                        candidates[candidate][year]['ward'][ward] += amount
                            print "Pass:", row
                            output = open("json.csv", "w")
                            output.write(str(candidates))
                            output.close()
                            if state == "" or state == " " or state == None:
                                testVar = raw_input("This passed.")
                        else:
                            record_bad_address(row)  
                            print "Fail:", row                
                    else:
                        record_bad_address(row)
                        print "Fail:", row

print candidates
