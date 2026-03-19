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
  1:  { name:'Building 1',  type:'Academic',  depts:['English & Foreign Languages'],                                          img:null },
  2:  { name:'Building 2',  type:'Amenities', depts:['Library'],                                                              img:null },
  3:  { name:'Building 3',  type:'Academic',  depts:['Automobile Engineering'],                                               img:null },
  4:  { name:'Building 4',  type:'Academic',  depts:['Civil Engineering','Construction Tech & Management','Mathematics'],      img:null },
  5:  { name:'Building 5',  type:'Academic',  depts:['Mechanical Engineering'],                                               img:null, entrance:[77.56773533308862, 12.908673572325771] },
  6:  { name:'Building 6',  type:'Academic',  depts:['Mechanical Lab Complex'],                                               img:null },
  7:  { name:'Building 7',  type:'Academic',  depts:['Electrical Engineering','Biological Science'],                          img:null, entrance:[77.56770458030661, 12.908400496230897] },
  8:  { name:'Building 8',  type:'Academic',  depts:['Industrial Engineering & Management'],                                  img:null },
  9:  { name:'Building 9',  type:'Academic',  depts:['Chemical Engineering','Chemistry'],                                     img:null, entrance:[77.56784103084789, 12.907942742298232] },
  10: { name:'Building 10', type:'Academic',  depts:['Biotechnology','Innovation & Leadership','Pharmacy'],                   img:null },
  11: { name:'Building 11', type:'Hostels',   depts:['NRI Hostel'],                                                           img:null },
  12: { name:'Building 12', type:'Academic',  depts:['Nursing','Evening College'],                                            img:null },
  13: { name:'Building 13', type:'Academic',  depts:['Arts, Science & Commerce','Journalism','Junior Business School (DSJBS)','MCA (VTU)','RIIC'], img:null, entrance:[77.566385245145, 12.907046932575483] },
  14: { name:'Building 14', type:'Academic',  depts:['Architecture','Aeronautical Engineering'],                              img:null, entrance:[77.56642291375863, 12.906727196324766] },
  15: { name:'Building 15', type:'Academic',  depts:['PGDM (DSBS)'],                                                         img:null },
  16: { name:'Building 16', type:'Academic',  depts:['International School'],                                                 img:null },
  17: { name:'Building 17', type:'Academic',  depts:['BCA (BU)','Electronics & Communication','MCA (BU)','Telecommunication Engineering'], img:null },
  18: { name:'Building 18', type:'Hostels',   depts:['Ladies Hostel 1'],                                                      img:null },
  19: { name:'Building 19', type:'Academic',  depts:['Computer Science & Engineering','Information Science & Engineering','Physics'], img:null },
  20: { name:'Building 20', type:'Hostels',   depts:['Ladies Hostel 2 – Sharada Working Women'],                              img:null },
  21: { name:'Building 21', type:'Hostels',   depts:['Ladies Hostel 3 – Nelson Mandela'],                                     img:null, entrance:[77.56568983703318, 12.908073285152483] },
  22: { name:'Building 22', type:'Academic',  depts:['Electronics & Instrumentation','Medical Electronics'],                  img:null, entrance:[77.56572097031085, 12.908303050525873] },
  23: { name:'Building 23', type:'Hostels',   depts:['Boys Hostel – Sardar Patel Hostel'],                                    img:null, entrance:[77.56548340838617, 12.908760841500964] },
  24: { name:'Building 24', type:'Academic',  depts:['Diploma'],                                                              img:null },
  25: { name:'Building 25', type:'Academic',  depts:['Dental College','DSU'],                                                 img:null, entrance:[77.56617695778999, 12.908843717420808] },
  26: { name:'Building 26', type:'Amenities', depts:['Conveno','Facilities'],                                                 img:null },
  27: { name:'PC Sagar Auditorium', type:'Amenities', depts:['Dr. Prem Chandra Sagar Auditorium','CD Sagar Auditorium'],      img:null },
  C:  { name:'Canteen',     type:'Amenities', depts:['Canteen'],                                                              img:null },
  P1: { name:'Parking 1',   type:'Parking',   depts:['Faculty Parking'],                                                     img:null },
  P2: { name:'Parking 2',   type:'Parking',   depts:['Student Parking'],                                                     img:null },
};

/**
 * Adjacency graph for Dijkstra routing.
 * Each key is a building ID, value is { neighbourId: distanceInMetres }.
 * Update distances once you have real measured path lengths.
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
