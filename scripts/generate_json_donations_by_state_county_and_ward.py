import csv

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


def get_candidate_slug(campaign, campaign_list):
    try:
        return campaign_list[campaign]
    except KeyError:
        return None


def in_united_states(country):
    return country == "United States"


def record_bad_address(row):
    with open('data/bad_address_list.csv', 'a') as csvfile:
        write = csv.writer(csvfile, delimiter='\t')
        write.writerow([row[0], row[1], row[2], row[3], row[4], row[5], year])

for year in range(2007,2013):
    year = str(year)
    f = open("data/CFR-"+str(year)+".csv")
    csvfile = csv.reader(f, delimiter=',', quotechar='"')
    next(csvfile)
    count = 0
    for row in csvfile:
        print row
        campaign = row[5]
        try:
            amount = float(str(row[2]).replace(",", "").replace("$", ""))
        except ValueError:
            pass
        occupation, muni, ward, country, county, city, state, lat, lon = "", "", "", "", "", "", "", "", ""
        candidate = get_candidate_slug(campaign, campaign_list)
        if candidate:
            r = requests.get('http://localhost:8080/maps/api/geocode/json?sensor=false%20&address='+row[1])
            if (len(r.json()['results']) > 0):
                s = r.json()['results'][0]['geometry']['location']
                lon, lat = str(s['lng']), str(s['lat'])
                r = requests.get('http://localhost:8080/coordinates2politics/'+lat+','+lon)
                s = r.json()[0]['politics']
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
                            if 'muni' in each:
                                muni = each['muni']
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
                        if 'muni' not in candidates[candidate][year]:
                            candidates[candidate][year]['muni'] = {}
                        if muni not in candidates[candidate][year]['muni']:
                            candidates[candidate][year]['muni'][muni] = amount
                        else:
                            candidates[candidate][year]['muni'][muni] += amount                            
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
                        output = open("data/json.csv", "w")
                        output.write(str(candidates))
                        output.close()

                        with open('data/good_address_list.csv', 'a') as csvfile:
                            write = csv.writer(csvfile, delimiter='\t')
                            write.writerow([row[0], row[1], row[2], row[3], row[4], row[5], year, lat, lon, ward, county, state, candidate, muni])
                    else:
                        print "Fail:", row
                        record_bad_address(row)
                else:
                    record_bad_address(row)  
                    print "Fail:", row
            else:
                record_bad_address(row)  
                print "Fail:", row                    
        else:
            print "Not in campaign_list"  
print candidates
