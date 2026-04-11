/**
 * buildings.js
 * All DSCE building data. Edit this file to update names, departments, images.
 *
 * Keys:
 *   name   — display name shown in sidebar & info card
 *   type   — category: 'Academic' | 'Amenities' | 'Hostels' | 'Parking'
 *   depts  — list of departments / occupants
 *   img    — path to building photo, or null for placeholder
 */

const BUILDINGS = {
  // entrance: [lng, lat]  — measured in QGIS
  // entrances: [[lng,lat],[lng,lat]]  — for buildings with multiple doors;
  //   getBuildingCenter() will pick the one nearest to the route origin.

  1:  { name:'Heritage Building', type:'Academic',  depts:['Admission','English & Foreign Languages','Office'],                                                                                                img:"images/1.jpg",  entrance:[77.566558, 12.908898] },
  2:  { name:'Building 2',        type:'Amenities', depts:['Library'],                                                                                                                                         img:"images/2.jpg",  entrance:[77.566959, 12.909235] },
  3:  { name:'Building 3',        type:'Academic',  depts:['Automobile Engineering'],                                                                                                                          img:"images/3.jpg",  entrance:[77.568212, 12.909036] },
  4:  { name:'Building 4',        type:'Academic',  depts:['Civil Engineering','Computer Science & Business Systems','Aeronautical Engineering','Computer Science & Data Science','Management Studies','Mathematics'], img:"images/4.jpg",  entrance:[77.568123, 12.908650] },
  5:  { name:'Building 5',        type:'Academic',  depts:['Mechanical Engineering'],                                                                                                                          img:"images/5.jpg",  entrance:[77.567739, 12.908642] },
  6:  { name:'Building 6',        type:'Academic',  depts:['Mechanical Lab Complex'],                                                                                                                          img:"images/6.jpg",  entrance:[77.568080, 12.908425] },
  7:  { name:'Building 7',        type:'Academic',  depts:['Electrical Engineering','Biological Science'],                                                                                                     img:"images/7.jpg",  entrance:[77.567700, 12.908397] },
  8:  { name:'Building 8',        type:'Academic',  depts:['Robotics and AI'],                                                                                                                                 img:"images/8.jpg",  entrance:[77.567531, 12.908275] },
  9:  { name:'Building 9',        type:'Academic',  depts:['Chemical Engineering','Chemistry'],                                                                                                                img:"images/9.jpg",  entrance:[77.567842, 12.907946] },
  10: { name:'Building 10',       type:'Academic',  depts:['CD Sagar','Biotechnology','Innovation & Leadership','Computer Science & Cybersecurity','Computer Science IoT & Blockchain'],                       img:"images/10.jpg", entrance:[77.567807, 12.907744] },
  11: { name:'Building 11',       type:'Hostels',   depts:['NRI Hostel'],                                                                                                                                      img:"images/11.jpg", entrance:[77.567608, 12.907329] },
  12: { name:'Building 12',       type:'Academic',  depts:['PU College','Physiotherapy','Nursing','Evening College'],                                                                                          img:"images/12.jpg", entrance:[77.567022, 12.906647] },
  13: { name:'Business Block',    type:'Academic',  depts:['Arts, Science & Commerce','Journalism','Junior Business School (DSJBS)','MCA (VTU)','RIIC','Fine Arts'],                                          img:"images/13.jpg", entrance:[77.566385, 12.907044] },
  14: { name:'Building 14',       type:'Academic',  depts:['Architecture'],                                                                                                                                    img:"images/14.jpg", entrance:[77.566427, 12.906724] },
  15: { name:'Building 15',       type:'Academic',  depts:['PGDM (DSBS)'],                                                                                                                                    img:"images/15.jpg", entrance:[77.565911, 12.907402] },
  16: { name:'Building 16',       type:'Academic',  depts:['International School'],                                                                                                                            img:"images/16.jpg", entrance:null, unreachable:true },
  17: { name:'Building 17',       type:'Academic',  depts:['BCA (BU)','Electronics & Communication','MCA (BU)','Telecommunication Engineering'],                                                               img:"images/17.jpg", entrances:[[77.565670, 12.907532],[77.565719, 12.907718]] },
  18: { name:'Building 18',       type:'Hostels',   depts:['Ladies Hostel 1'],                                                                                                                                 img:"images/18.jpg", entrances:[[77.566134, 12.907772],[77.566100, 12.907978]] },
  19: { name:'Building 19',       type:'Academic',  depts:['Computer Science & Engineering','Information Science & Engineering','Physics'],                                                                    img:"images/19.jpg", entrances:[[77.566134, 12.907772],[77.566100, 12.907978]] },
  20: { name:'Building 20',       type:'Hostels',   depts:['Ladies Hostel 2 – Sharada Working Women'],                                                                                                        img:"images/20.jpg", entrance:[77.566543, 12.907590] },
  21: { name:'Building 21',       type:'Hostels',   depts:['Ladies Hostel 3 – Nelson Mandela'],                                                                                                               img:"images/21.jpg", entrance:[77.565680, 12.908070] },
  22: { name:'Building 22',       type:'Academic',  depts:['Electronics & Instrumentation','Medical Electronics'],                                                                                             img:"images/22.jpg", entrance:[77.565720, 12.908304] },
  23: { name:'Building 23',       type:'Hostels',   depts:['Boys Hostel – Sardar Patel Hostel'],                                                                                                               img:"images/23.jpg", entrance:[77.565479, 12.908763] },
  24: { name:'Building 24',       type:'Academic',  depts:['Civil Engineering'],                                                                                                                               img:"images/24.jpg", entrance:[77.565764, 12.908535] },
  25: { name:'Building 25',       type:'Academic',  depts:['Dental College','DSU'],                                                                                                                            img:"images/25.jpg", entrance:[77.566175, 12.908841] },
  26: { name:'Building 26',       type:'Amenities', depts:['Conveno','Facilities'],                                                                                                                            img:"images/26.jpg", entrance:[77.566375, 12.908908] },
  27: { name:'PC Sagar Auditorium', type:'Amenities', depts:['Dr. Prem Chandra Sagar Auditorium','CD Sagar Auditorium'],                                                                                       img:"images/pcsagar.jpg", entrance:[77.566982, 12.909007] },
  C:    { name:'Canteen',      type:'Amenities', depts:['Canteen'],          img:"images/canteen.jpg", entrance:[77.566324, 12.908388] },
  XEROX:{ name:'Xerox Shop',   type:'Amenities', depts:['Xerox & Printing'], img:null,                 entrance:[77.567369, 12.909243] },
  FT1:  { name:'Food Truck 1', type:'Amenities', depts:['Food Truck'],       img:null,                 entrance:[77.56744419422034, 12.907488016292533] },
  FT2:  { name:'Food Truck 2', type:'Amenities', depts:['Food Truck'],       img:null,                 entrance:[77.56681491560488, 12.909201839558094] },
  GATE1:{ name:'Main Gate',    type:'Gates',     depts:['Main Entrance'],    img:null,                 entrance:[77.566902, 12.909492] },
  GATE2:{ name:'Gate 2',       type:'Gates',     depts:['Side Entrance'],    img:null,                 entrance:[77.566451, 12.909505] },
  P1:   { name:'Parking 1',    type:'Parking',   depts:['Faculty Parking'],  img:null },
  P2:   { name:'Parking 2',    type:'Parking',   depts:['Student Parking'],  img:null },
};

/**
 * Adjacency graph for Dijkstra routing.
 * Each key is a building ID, value is { neighbourId: distanceInMetres }.
 */
const GRAPH = {
  1:  { 2:110, 14:200, 27:180 },
  2:  { 1:110, 7:180,  27:200 },
  3:  { 4:140, 5:170 },
  4:  { 3:140, 5:120,  8:160, 9:200, 14:180 },
  5:  { 4:120, 6:80,   8:130 },
  6:  { 5:80,  7:160,  8:100 },
  7:  { 2:180, 6:160,  11:200, 22:220 },
  8:  { 5:130, 6:100,  4:160,  10:200, 17:180 },
  9:  { 4:200, 10:150 },
  10: { 8:200, 9:150,  13:160, 15:180, 27:240 },
  11: { 7:200, 23:120 },
  12: { 13:130, 16:150, 17:160 },
  13: { 10:160, 12:130, 15:110, 19:170, 22:200 },
  14: { 1:200,  4:180,  27:210 },
  15: { 10:180, 13:110, 16:160, 25:200 },
  16: { 12:150, 15:160, 25:230 },
  17: { 8:180,  12:160, 18:200, 22:150 },
  18: { 17:200, 20:110, 23:180 },
  19: { 13:170, 22:180, 26:220 },
  20: { 18:110, 21:80 },
  21: { 20:80,  23:160 },
  22: { 7:220,  13:200, 17:150, 19:180 },
  23: { 11:120, 18:180, 21:160, C:80 },
  24: { 13:300, 25:150 },
  25: { 15:200, 16:230, 24:150 },
  26: { 19:220, C:150 },
  27: { 1:180,  2:200,  10:240, 14:210 },
  C:  { 23:80,  26:150 },
};
