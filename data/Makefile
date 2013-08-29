clean:
	rm -r zip/ shp/ json/ csv/

zip/counties.zip:
	curl -o zip/counties.zip http://www.pasda.psu.edu/data/padot/boundary_layers/PaCounty2013_02.zip

zip/wards.zip:
	curl -o zip/wards.zip http://www.pasda.psu.edu/philacity/data/PhiladelphiaPoliticalWards201302.zip

zip/districts.zip:
	curl -o zip/districts.zip http://www.pasda.psu.edu/philacity/data/PhiladelphiaCouncilDistricts_2000.zip

zip/pa_municipalities.zip:
	curl -o zip/pa_municipalities.zip http://www.pasda.psu.edu/data/padot/boundary_layers/PaMunicipalities2013_03.zip

zip/nj_boundaries.zip:
	curl -o zip/nj_boundaries.zip https://njgin.state.nj.us/oit/gis/download/bounds_nj_shp.zip

zip/national_boundaries.zip:
	curl -L -o zip/national_boundaries.zip http://www.naturalearthdata.com/http//www.naturalearthdata.com/download/50m/cultural/ne_50m_admin_1_states_provinces_lakes_shp.zip

shp/PhiladelphiaCouncilDistricts_2000.shp: zip/districts.zip
	unzip zip/districts.zip -d shp
	touch PhiladelphiaCouncilDistricts_2000.shp

shp/PaCounty2013_02.shp: zip/counties.zip
	unzip zip/counties.zip -d shp

shp/PaMunicipalities2013_03.shp: zip/pa_municipalities.zip
	unzip zip/pa_municipalities.zip -d shp

shp/nj_munis.shp: zip/nj_boundaries.zip
	unzip zip/nj_boundaries.zip -d shp

shp/PhiladelphiaPoliticalWards201302/PhiladelphiaPoliticalWards201302.shp: zip/wards.zip
	unzip zip/wards.zip -d shp

shp/ne_50m_admin_1_states_provinces_lakes_shp.shp: zip/national_boundaries.zip
	unzip zip/national_boundaries.zip -d shp

shp/munis_for_dstk.shp: shp/nj_munis.shp shp/PaMunicipalities2013_03.shp
	ogr2ogr shp/munis_for_dstk.shp -t_srs "EPSG:4326" shp/PaMunicipalities2013_03.shp -sql "SELECT CAST(MUNICIPAL1 as character(50)) as muni, CAST(MSLINK as character(15)) + '-pa' as code FROM PaMunicipalities2013_03"
	ogr2ogr -update -append -t_srs "EPSG:4326" shp/munis_for_dstk.shp shp/nj_munis.shp -nln munis_for_dstk -sql "SELECT CAST(MUN as character(50)) as muni, CAST(MUN_CODE as character(15)) + '-nj' as code FROM nj_munis"

shp/pa_counties_trimmed.shp: shp/PaCounty2013_02.shp
	ogr2ogr -f "ESRI Shapefile" -t_srs "EPSG:4326" -sql "SELECT COUNTY_NAM as county, COUNTY_NUM as county_num FROM PaCounty2013_02 WHERE COUNTY_NUM IN ('09', '15', '67', '46', '23')" shp/pa_counties_trimmed.shp shp/PaCounty2013_02.shp

shp/pa_munis_trimmed.shp: shp/PaMunicipalities2013_03.shp
	ogr2ogr -f "ESRI Shapefile" -t_srs "EPSG:4326" -sql "SELECT MUNICIPAL1 as muni, c.COUNTY_NAM as county, CAST(MSLINK as character(15)) + '-pa' as code FROM PaMunicipalities2013_03 LEFT JOIN 'shp/PaCounty2013_02.dbf'.PaCounty2013_02 c ON PaMunicipalities2013_03.COUNTY = c.COUNTY_NUM WHERE COUNTY IN ('09', '15', '67', '46', '23')" shp/pa_munis_trimmed.shp shp/PaMunicipalities2013_03.shp

shp/nj_counties_trimmed.shp: shp/nj_counties.shp
	ogr2ogr -f "ESRI Shapefile" -t_srs "EPSG:4326" -sql "SELECT COUNTY as county FROM nj_counties WHERE COUNTY IN ('SALEM', 'CAMDEN', 'BURLINGTON', 'GLOUCESTER')" shp/nj_counties_trimmed.shp shp/nj_counties.shp

shp/nj_munis_trimmed.shp: shp/nj_munis.shp
	ogr2ogr -f "ESRI Shapefile" -t_srs "EPSG:4326" -sql "SELECT MUN as muni, COUNTY as county, CAST(MUN_CODE as character(15)) + '-nj' as code FROM nj_munis WHERE COUNTY IN ('SALEM', 'CAMDEN', 'BURLINGTON', 'GLOUCESTER')" shp/nj_munis_trimmed.shp shp/nj_munis.shp

shp/us.shp: shp/ne_50m_admin_1_states_provinces_lakes_shp.shp
	ogr2ogr -f "ESRI Shapefile" -t_srs "EPSG: 4326" -sql "SELECT iso_3166_2 as abbrev, name FROM ne_50m_admin_1_states_provinces_lakes_shp WHERE sr_adm0_a3 = 'USA'" shp/us.shp shp/ne_50m_admin_1_states_provinces_lakes_shp.shp

csv/composite.txt:
	curl -o composite.txt ftp://ftp.phila-records.com/CF%20DATA%20COMPOSITE%20AS%20OF%2003%2001%202013/CF%20DATA%20COMPOSITE%20AS%20OF%2003%2001%202013.txt

csv/pa_counties.csv: shp/PaCounty2013_02.shp shp/pa_counties_trimmed.shp
	mkdir -p csv
	ogr2ogr -f "CSV" csv/pa_counties.csv shp/pa_counties_trimmed.shp

sql/munis.sql: shp/munis_for_dstk.shp
	mkdir -p sql
	shp2pgsql shp/munis_for_dstk.shp public.munis > sql/munis.sql

json/counties.json: shp/PaCounty2013_02.shp
	mkdir -p json
	ogr2ogr -f "GeoJSON" json/counties.json shp/PaCounty2013_02.shp
	topojson -o json/counties.json --id-property COUNTY_NAM -q 1000 json/counties.json

json/wards.json: shp/PhiladelphiaPoliticalWards201302/PhiladelphiaPoliticalWards201302.shp
	mkdir -p json
	ogr2ogr -f "GeoJSON" -t_srs "EPSG:4326" json/wards.json shp/PhiladelphiaPoliticalWards201302.shp
	topojson -o json/wards.json --id-property WARD_NUM -q 1000 json/wards.json

json/wards_w_districts.json: shp/PhiladelphiaCouncilDistricts_2000.shp json/wards.json
	mkdir -p json
	ogr2ogr -f "GeoJSON" -t_srs "EPSG:4326" json/districts.json shp/PhiladelphiaCouncilDistricts_2000.shp
	topojson -o json/wards_w_districts.json --id-property WARD_NUM,DIST_NUM -q 1000 PhiladelphiaPoliticalWards201302/waon json/districts.json

json/munis.json: shp/pa_munis_trimmed.shp shp/pa_counties_trimmed.shp shp/nj_munis_trimmed.shp shp/nj_counties_trimmed.shp csv/pa_counties.csv
	mkdir -p json
	ogr2ogr shp/counties.shp shp/pa_counties_trimmed.shp
	ogr2ogr -update -append shp/counties.shp shp/nj_counties_trimmed.shp -nln counties
	ogr2ogr shp/munis.shp shp/pa_munis_trimmed.shp
	ogr2ogr -update -append shp/munis.shp shp/nj_munis_trimmed.shp -nln munis
	topojson -o json/munis.json -q 1000 --id-property=code,county -p county_name=county,muni_name=muni -- shp/munis.shp shp/counties.shp

json/us.json: shp/us.shp
	topojson -o json/us.json -q 1000 --id-property=name -p -- shp/us.shp
