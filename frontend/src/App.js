import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import {
  getModelPrediction,
  getMatchupAnalysis,
  fetchAnalyticsVenues,
  getVenueAnalytics,
} from './api/client';

const TOTAL_OVERS = 20;
const POWERPLAY_END = 6;
const DEATH_START = 16;
const IPL_TEAMS = ['CSK', 'MI', 'RCB', 'KKR', 'SRH', 'RR', 'DC', 'PBKS', 'GT', 'LSG'];

// ============================================================
// IN-MEMORY DATABASE (mirrors backend DB for offline use)
// ============================================================
const DB_PLAYERS = [
  { id:1, name:"Ravindra Jadeja", type:"SPIN", team:"CSK", role:"ALL", economy:6.8, wickets:178, average:28.4, strikeRate:22, formIndex:0.84, recentForms:["G","W","G","A","G"], color:"#ffd60a", initials:"RJ" },
  { id:2, name:"Matheesha Pathirana", type:"FAST", team:"CSK", role:"BOWLER", economy:7.6, wickets:34, average:22.1, strikeRate:15, formIndex:0.82, recentForms:["W","G","W","G","A"], color:"#ffd60a", initials:"MP" },
  { id:3, name:"Deepak Chahar", type:"MEDIUM", team:"CSK", role:"BOWLER", economy:7.8, wickets:77, average:29.2, strikeRate:22, formIndex:0.70, recentForms:["A","G","G","A","W"], color:"#ffd60a", initials:"DC" },
  { id:4, name:"Maheesh Theekshana", type:"SPIN", team:"CSK", role:"BOWLER", economy:7.4, wickets:31, average:30.0, strikeRate:24, formIndex:0.73, recentForms:["G","A","G","W","A"], color:"#ffd60a", initials:"MT" },

  { id:5, name:"Jasprit Bumrah", type:"FAST", team:"MI", role:"BOWLER", economy:6.2, wickets:165, average:23.1, strikeRate:18, formIndex:0.93, recentForms:["W","W","G","W","G"], color:"#4da6ff", initials:"JB" },
  { id:6, name:"Piyush Chawla", type:"SPIN", team:"MI", role:"BOWLER", economy:7.5, wickets:181, average:27.8, strikeRate:22, formIndex:0.75, recentForms:["G","A","W","G","A"], color:"#4da6ff", initials:"PC" },
  { id:7, name:"Gerald Coetzee", type:"FAST", team:"MI", role:"BOWLER", economy:8.4, wickets:22, average:26.5, strikeRate:16, formIndex:0.72, recentForms:["A","W","G","A","G"], color:"#4da6ff", initials:"GC" },
  { id:8, name:"Hardik Pandya", type:"MEDIUM", team:"MI", role:"ALL", economy:7.4, wickets:68, average:31.2, strikeRate:24, formIndex:0.69, recentForms:["A","G","A","A","G"], color:"#4da6ff", initials:"HP" },

  { id:9, name:"Mohammed Siraj", type:"FAST", team:"RCB", role:"BOWLER", economy:7.8, wickets:93, average:29.6, strikeRate:22, formIndex:0.77, recentForms:["G","W","A","G","G"], color:"#e74c3c", initials:"MS" },
  { id:10, name:"Yash Dayal", type:"MEDIUM", team:"RCB", role:"BOWLER", economy:8.1, wickets:28, average:31.5, strikeRate:23, formIndex:0.74, recentForms:["G","A","W","G","A"], color:"#e74c3c", initials:"YD" },
  { id:11, name:"Karn Sharma", type:"SPIN", team:"RCB", role:"BOWLER", economy:7.9, wickets:76, average:31.0, strikeRate:24, formIndex:0.68, recentForms:["A","G","A","W","A"], color:"#e74c3c", initials:"KS" },
  { id:12, name:"Glenn Maxwell", type:"SPIN", team:"RCB", role:"ALL", economy:7.5, wickets:37, average:30.7, strikeRate:25, formIndex:0.66, recentForms:["A","A","G","A","G"], color:"#e74c3c", initials:"GM" },

  { id:13, name:"Sunil Narine", type:"SPIN", team:"KKR", role:"ALL", economy:6.7, wickets:180, average:25.4, strikeRate:23, formIndex:0.88, recentForms:["G","W","G","W","G"], color:"#9b59b6", initials:"SN" },
  { id:14, name:"Varun Chakaravarthy", type:"SPIN", team:"KKR", role:"BOWLER", economy:7.3, wickets:83, average:27.9, strikeRate:21, formIndex:0.83, recentForms:["W","G","W","A","G"], color:"#9b59b6", initials:"VC" },
  { id:15, name:"Mitchell Starc", type:"FAST", team:"KKR", role:"BOWLER", economy:8.0, wickets:51, average:28.8, strikeRate:19, formIndex:0.78, recentForms:["A","W","G","G","W"], color:"#9b59b6", initials:"MS" },
  { id:16, name:"Andre Russell", type:"MEDIUM", team:"KKR", role:"ALL", economy:8.8, wickets:115, average:24.5, strikeRate:15, formIndex:0.76, recentForms:["W","A","G","A","W"], color:"#9b59b6", initials:"AR" },

  { id:17, name:"Pat Cummins", type:"FAST", team:"SRH", role:"BOWLER", economy:7.7, wickets:63, average:30.1, strikeRate:23, formIndex:0.81, recentForms:["G","W","G","A","W"], color:"#ff8c00", initials:"PC" },
  { id:18, name:"Bhuvneshwar Kumar", type:"MEDIUM", team:"SRH", role:"BOWLER", economy:7.4, wickets:181, average:27.2, strikeRate:22, formIndex:0.79, recentForms:["G","G","A","W","G"], color:"#ff8c00", initials:"BK" },
  { id:19, name:"T Natarajan", type:"FAST", team:"SRH", role:"BOWLER", economy:8.2, wickets:67, average:26.9, strikeRate:20, formIndex:0.80, recentForms:["W","A","G","W","G"], color:"#ff8c00", initials:"TN" },
  { id:20, name:"Mayank Markande", type:"SPIN", team:"SRH", role:"BOWLER", economy:7.8, wickets:37, average:31.1, strikeRate:24, formIndex:0.70, recentForms:["A","G","A","G","W"], color:"#ff8c00", initials:"MM" },

  { id:21, name:"Trent Boult", type:"FAST", team:"RR", role:"BOWLER", economy:7.6, wickets:121, average:27.0, strikeRate:21, formIndex:0.82, recentForms:["G","W","G","A","G"], color:"#ff5ea8", initials:"TB" },
  { id:22, name:"Yuzvendra Chahal", type:"SPIN", team:"RR", role:"BOWLER", economy:7.5, wickets:205, average:22.8, strikeRate:17, formIndex:0.86, recentForms:["G","W","A","G","W"], color:"#ff5ea8", initials:"YC" },
  { id:23, name:"Ravichandran Ashwin", type:"SPIN", team:"RR", role:"ALL", economy:7.1, wickets:180, average:28.7, strikeRate:24, formIndex:0.78, recentForms:["A","G","G","W","A"], color:"#ff5ea8", initials:"RA" },
  { id:24, name:"Avesh Khan", type:"FAST", team:"RR", role:"BOWLER", economy:8.3, wickets:74, average:29.9, strikeRate:21, formIndex:0.73, recentForms:["A","W","A","G","G"], color:"#ff5ea8", initials:"AK" },

  { id:25, name:"Kuldeep Yadav", type:"SPIN", team:"DC", role:"BOWLER", economy:7.2, wickets:87, average:26.4, strikeRate:20, formIndex:0.86, recentForms:["W","G","W","W","A"], color:"#3498db", initials:"KY" },
  { id:26, name:"Axar Patel", type:"SPIN", team:"DC", role:"ALL", economy:7.0, wickets:123, average:30.0, strikeRate:26, formIndex:0.80, recentForms:["G","A","G","W","G"], color:"#3498db", initials:"AP" },
  { id:27, name:"Khaleel Ahmed", type:"FAST", team:"DC", role:"BOWLER", economy:8.0, wickets:74, average:28.6, strikeRate:20, formIndex:0.75, recentForms:["A","G","W","G","A"], color:"#3498db", initials:"KA" },
  { id:28, name:"Mukesh Kumar", type:"MEDIUM", team:"DC", role:"BOWLER", economy:8.5, wickets:24, average:31.2, strikeRate:22, formIndex:0.71, recentForms:["G","A","A","W","G"], color:"#3498db", initials:"MK" },

  { id:29, name:"Arshdeep Singh", type:"FAST", team:"PBKS", role:"BOWLER", economy:8.2, wickets:76, average:27.4, strikeRate:20, formIndex:0.80, recentForms:["W","G","A","G","W"], color:"#c0392b", initials:"AS" },
  { id:30, name:"Kagiso Rabada", type:"FAST", team:"PBKS", role:"BOWLER", economy:8.0, wickets:117, average:22.5, strikeRate:15, formIndex:0.82, recentForms:["G","W","G","A","W"], color:"#c0392b", initials:"KR" },
  { id:31, name:"Harpreet Brar", type:"SPIN", team:"PBKS", role:"BOWLER", economy:7.7, wickets:31, average:30.9, strikeRate:24, formIndex:0.72, recentForms:["A","G","G","A","W"], color:"#c0392b", initials:"HB" },
  { id:32, name:"Sam Curran", type:"MEDIUM", team:"PBKS", role:"ALL", economy:8.6, wickets:58, average:31.7, strikeRate:22, formIndex:0.74, recentForms:["A","W","G","A","G"], color:"#c0392b", initials:"SC" },

  { id:33, name:"Mohammed Shami", type:"FAST", team:"GT", role:"BOWLER", economy:7.7, wickets:127, average:26.5, strikeRate:20, formIndex:0.78, recentForms:["G","A","W","G","A"], color:"#1abc9c", initials:"MS" },
  { id:34, name:"Rashid Khan", type:"SPIN", team:"GT", role:"ALL", economy:6.8, wickets:149, average:21.8, strikeRate:18, formIndex:0.90, recentForms:["W","G","W","G","W"], color:"#1abc9c", initials:"RK" },
  { id:35, name:"Mohit Sharma", type:"MEDIUM", team:"GT", role:"BOWLER", economy:8.1, wickets:132, average:27.6, strikeRate:19, formIndex:0.77, recentForms:["G","W","A","G","G"], color:"#1abc9c", initials:"MS" },
  { id:36, name:"Noor Ahmad", type:"SPIN", team:"GT", role:"BOWLER", economy:7.5, wickets:24, average:29.0, strikeRate:23, formIndex:0.76, recentForms:["A","G","W","G","A"], color:"#1abc9c", initials:"NA" },

  { id:37, name:"Ravi Bishnoi", type:"SPIN", team:"LSG", role:"BOWLER", economy:7.4, wickets:63, average:28.2, strikeRate:23, formIndex:0.81, recentForms:["G","W","A","G","W"], color:"#00a8ff", initials:"RB" },
  { id:38, name:"Naveen-ul-Haq", type:"FAST", team:"LSG", role:"BOWLER", economy:8.0, wickets:25, average:27.5, strikeRate:19, formIndex:0.76, recentForms:["A","G","W","G","A"], color:"#00a8ff", initials:"NH" },
  { id:39, name:"Mohsin Khan", type:"FAST", team:"LSG", role:"BOWLER", economy:7.9, wickets:28, average:26.7, strikeRate:20, formIndex:0.74, recentForms:["G","A","G","W","A"], color:"#00a8ff", initials:"MK" },
  { id:40, name:"Krunal Pandya", type:"SPIN", team:"LSG", role:"ALL", economy:7.3, wickets:76, average:31.0, strikeRate:27, formIndex:0.73, recentForms:["A","G","A","G","W"], color:"#00a8ff", initials:"KP" },
];

const DB_BATTERS = [
  { team:"CSK", name:"Ruturaj Gaikwad", style:"ANCHOR" },
  { team:"CSK", name:"Devon Conway", style:"ANCHOR" },
  { team:"CSK", name:"Shivam Dube", style:"ATTACK" },
  { team:"CSK", name:"MS Dhoni", style:"ATTACK" },

  { team:"MI", name:"Rohit Sharma", style:"ATTACK" },
  { team:"MI", name:"Ishan Kishan", style:"ATTACK" },
  { team:"MI", name:"Suryakumar Yadav", style:"SWEEP" },
  { team:"MI", name:"Tilak Varma", style:"ANCHOR" },

  { team:"RCB", name:"Virat Kohli", style:"ANCHOR" },
  { team:"RCB", name:"Faf du Plessis", style:"ATTACK" },
  { team:"RCB", name:"Rajat Patidar", style:"ATTACK" },
  { team:"RCB", name:"Dinesh Karthik", style:"SWEEP" },

  { team:"KKR", name:"Phil Salt", style:"ATTACK" },
  { team:"KKR", name:"Shreyas Iyer", style:"ANCHOR" },
  { team:"KKR", name:"Venkatesh Iyer", style:"ATTACK" },
  { team:"KKR", name:"Rinku Singh", style:"ATTACK" },

  { team:"SRH", name:"Travis Head", style:"ATTACK" },
  { team:"SRH", name:"Abhishek Sharma", style:"ATTACK" },
  { team:"SRH", name:"Aiden Markram", style:"ANCHOR" },
  { team:"SRH", name:"Heinrich Klaasen", style:"SWEEP" },

  { team:"RR", name:"Yashasvi Jaiswal", style:"ATTACK" },
  { team:"RR", name:"Jos Buttler", style:"ATTACK" },
  { team:"RR", name:"Sanju Samson", style:"ANCHOR" },
  { team:"RR", name:"Shimron Hetmyer", style:"ATTACK" },

  { team:"DC", name:"David Warner", style:"ATTACK" },
  { team:"DC", name:"Prithvi Shaw", style:"ATTACK" },
  { team:"DC", name:"Rishabh Pant", style:"SWEEP" },
  { team:"DC", name:"Tristan Stubbs", style:"ATTACK" },

  { team:"PBKS", name:"Shikhar Dhawan", style:"ANCHOR" },
  { team:"PBKS", name:"Prabhsimran Singh", style:"ATTACK" },
  { team:"PBKS", name:"Liam Livingstone", style:"ATTACK" },
  { team:"PBKS", name:"Shashank Singh", style:"ATTACK" },

  { team:"GT", name:"Shubman Gill", style:"ANCHOR" },
  { team:"GT", name:"Sai Sudharsan", style:"ANCHOR" },
  { team:"GT", name:"David Miller", style:"ATTACK" },
  { team:"GT", name:"Rahul Tewatia", style:"ATTACK" },

  { team:"LSG", name:"KL Rahul", style:"ANCHOR" },
  { team:"LSG", name:"Quinton de Kock", style:"ATTACK" },
  { team:"LSG", name:"Nicholas Pooran", style:"SWEEP" },
  { team:"LSG", name:"Marcus Stoinis", style:"ATTACK" },
];

const DB_STADIUMS = [
  { id:1, name:"Wankhede Stadium",     city:"Mumbai",    pitchType:"flat",    dewFactor:0.8, bounceRating:0.6, spinFriendly:false, boundary:68 },
  { id:2, name:"Eden Gardens",         city:"Kolkata",   pitchType:"spin",    dewFactor:0.7, bounceRating:0.4, spinFriendly:true,  boundary:65 },
  { id:3, name:"M Chinnaswamy",        city:"Bangalore", pitchType:"batting", dewFactor:0.6, bounceRating:0.7, spinFriendly:false, boundary:70 },
  { id:4, name:"MA Chidambaram",       city:"Chennai",   pitchType:"spin",    dewFactor:0.5, bounceRating:0.3, spinFriendly:true,  boundary:62 },
  { id:5, name:"Narendra Modi Stadium",city:"Ahmedabad", pitchType:"flat",    dewFactor:0.55,bounceRating:0.65,spinFriendly:false, boundary:75 },
];

const TEAM_COLORS = {
  CSK: '#ffd60a',
  MI: '#4da6ff',
  RCB: '#e74c3c',
  KKR: '#9b59b6',
  SRH: '#ff8c00',
  RR: '#ff5ea8',
  DC: '#3498db',
  PBKS: '#c0392b',
  GT: '#1abc9c',
  LSG: '#00a8ff',
};

const CURRENT_SQUADS = {
  CSK: ['Ruturaj Gaikwad', 'Ayush Mhatre', 'Sarfaraz Khan', 'Sanju Samson', 'MS Dhoni', 'Urvil Patel', 'Kartik Sharma', 'Shivam Dube', 'Ramakrishna Ghosh', 'Shreyas Gopal', 'Aman Khan', 'Prashant Veer', 'Rahul Chahar', 'Khaleel Ahmed', 'Gurjapneet Singh', 'Anshul Kamboj', 'Mukesh Choudhary', 'Jamie Overton', 'Dewald Brevis', 'Matt Short', 'Spencer Johnson', 'Zak Foulkes', 'Matt Henry', 'Noor Ahmad', 'Akeal Hosein'],
  MI: ['Hardik Pandya', 'Rohit Sharma', 'Suryakumar Yadav', 'Danish Malewar', 'Robin Minz', 'Shardul Thakur', 'Naman Dhir', 'Raj Bawa', 'Tilak Varma', 'Mayank Markande', 'Raghu Sharma', 'Ashwani Kumar', 'Deepak Chahar', 'Jasprit Bumrah', 'Mohammed Izhar', 'Mayank Rawat', 'Will Jacks', 'Ryan Rickelton', 'Quinton de Kock', 'Corbin Bosch', 'Sherfane Rutherford', 'Mitchell Santner', 'Trent Boult', 'AM Ghazanfar'],
  RCB: ['Rajat Patidar', 'Virat Kohli', 'Devdutt Padikkal', 'Jitesh Sharma', 'Venkatesh Iyer', 'Krunal Pandya', 'Swapnil Singh', 'Satwik Deswal', 'Kanish Chouhan', 'Vihaan Malhotra', 'Vicky Ostwal', 'Suyash Sharma', 'Bhuvneshwar Kumar', 'Rasikh Salam', 'Mangesh Yadav', 'Abhinandan Singh', 'Jacob Bethell', 'Phil Salt', 'Jordan Cox', 'Josh Hazlewood', 'Tim David', 'Romario Shepherd', 'Jacob Duffy', 'Nuwan Thushara'],
  KKR: ['Ajinkya Rahane', 'Angkrish Raghuvanshi', 'Manish Pandey', 'Rahul Tripathi', 'Rinku Singh', 'Tejasvi Dahiya', 'Anukul Roy', 'Daksh Kamra', 'Ramandeep Singh', 'Sarthak Ranjan', 'Prashant Solanki', 'Varun Chakravarthy', 'Kartik Tyagi', 'Umran Malik', 'Vaibhav Arora', 'Saurabh Dubey', 'Navdeep Saini', 'Cameron Green', 'Rovman Powell', 'Sunil Narine', 'Finn Allen', 'Rachin Ravindra', 'Tim Seifert', 'Matheesha Pathirana', 'Blessing Muzarabani'],
  SRH: ['Pat Cummins', 'Ishan Kishan', 'Aniket Verma', 'R Smaran', 'Salil Arora', 'Abhishek Sharma', 'Nitish Kumar Reddy', 'Harshal Patel', 'Harsh Dubey', 'Shivang Kumar', 'Krains Fuletra', 'Zeeshan Ansari', 'Amit Kumar', 'Jaydev Unadkat', 'Shivam Mavi', 'Onkar Tarmale', 'Sakib Hussain', 'Praful Hinge', 'Liam Livingstone', 'Brydon Carse', 'David Payne', 'Travis Head', 'Heinrich Klaasen', 'Kamindu Mendis', 'Eshan Malinga'],
  RR: ['Riyan Parag', 'Shubham Dubey', 'Vaibhav Suryavanshi', 'Yashasvi Jaiswal', 'Aman Rao', 'Dhruv Jurel', 'Ravi Singh', 'Ravindra Jadeja', 'Yudhvir Singh', 'Ravi Bishnoi', 'Yash Raj Punja', 'Vignesh Puthur', 'Sandeep Sharma', 'Tushar Deshpande', 'Sushant Mishra', 'Kuldeep Sen', 'Brijesh Sharma', 'Jofra Archer', 'Lhuan-dre Pretorius', 'Donovan Ferreira', 'Kwena Maphaka', 'Nandre Burger', 'Adam Milne', 'Shimron Hetmyer', 'Dasun Shanaka'],
  DC: ['Axar Patel', 'Prithvi Shaw', 'Karun Nair', 'Nitish Rana', 'Ashutosh Sharma', 'Sameer Rizvi', 'Sahil Parakh', 'KL Rahul', 'Abishek Porel', 'Vipraj Nigam', 'Auqib Nabi', 'Madhav Tiwari', 'T Vijay', 'Ajay Mandal', 'Kuldeep Yadav', 'Mukesh Kumar', 'T Natarajan', 'Mitchell Starc', 'Pathum Nissanka', 'Dushmantha Chameera', 'Lungi Ngidi', 'David Miller', 'Tristan Stubbs', 'Kyle Jamieson'],
  PBKS: ['Shreyas Iyer', 'Harnoor Singh', 'Nehal Wadhera', 'Priyansh Arya', 'Pyla Avinash', 'Prabhsimran Singh', 'Vishnu Vinod', 'Harpreet Brar', 'Musheer Khan', 'Shashank Singh', 'Suryansh Shedge', 'Praveen Dubey', 'Yuzvendra Chahal', 'Arshdeep Singh', 'Vijaykumar Vyshak', 'Vishal Nishad', 'Yash Thakur', 'Azmatullah Omarzai', 'Ben Dwarshuis', 'Cooper Connolly', 'Marcus Stoinis', 'Mitchell Owen', 'Xavier Bartlett', 'Marco Jansen', 'Lockie Ferguson'],
  GT: ['Shubman Gill', 'Sai Sudharsan', 'Shahrukh Khan', 'Anuj Rawat', 'Kumar Kushagra', 'Washington Sundar', 'Manav Suthar', 'Rahul Tewatia', 'Nishant Sindhu', 'Jayant Yadav', 'Arshad Khan', 'Sai Kishore', 'Mohammed Siraj', 'Prasidh Krishna', 'Gurnoor Brar', 'Ishant Sharma', 'Ashok Sharma', 'Kulwant Khejroliya', 'Jos Buttler', 'Tom Banton', 'Luke Wood', 'Glenn Phillips', 'Jason Holder', 'Rashid Khan', 'Kagiso Rabada'],
  LSG: ['Rishabh Pant', 'Abdul Samad', 'Ayush Badoni', 'Himmat Singh', 'Akshat Raghuwanshi', 'Mukul Choudhary', 'Arshin Kulkarni', 'Shahbaz Ahmed', 'Digvesh Rathi', 'M Siddharth', 'Akash Singh', 'Avesh Khan', 'Mohammed Shami', 'Mohsin Khan', 'Prince Yadav', 'Arjun Tendulkar', 'Mayank Yadav', 'Naman Tiwari', 'Matthew Breetzke', 'Aiden Markram', 'Anrich Nortje', 'Nicholas Pooran', 'Josh Inglis', 'Mitchell Marsh', 'Wanindu Hasaranga'],
};

const SPIN_BOWLERS = new Set([
  'Rahul Chahar', 'Shreyas Gopal', 'Noor Ahmad', 'Akeal Hosein', 'Mayank Markande', 'Mitchell Santner', 'AM Ghazanfar',
  'Krunal Pandya', 'Swapnil Singh', 'Vicky Ostwal', 'Suyash Sharma', 'Prashant Solanki', 'Varun Chakravarthy',
  'Sunil Narine', 'Rachin Ravindra', 'Zeeshan Ansari', 'Harsh Dubey', 'Ravindra Jadeja', 'Ravi Bishnoi', 'Vignesh Puthur',
  'Axar Patel', 'Vipraj Nigam', 'Ajay Mandal', 'Kuldeep Yadav', 'Harpreet Brar', 'Praveen Dubey', 'Yuzvendra Chahal',
  'Washington Sundar', 'Manav Suthar', 'Jayant Yadav', 'Sai Kishore', 'Rashid Khan', 'Shahbaz Ahmed', 'Digvesh Rathi',
  'M Siddharth', 'Arjun Tendulkar', 'Wanindu Hasaranga', 'Liam Livingstone', 'Glenn Phillips', 'Matt Short',
]);

const FAST_BOWLERS = new Set([
  'Khaleel Ahmed', 'Gurjapneet Singh', 'Anshul Kamboj', 'Mukesh Choudhary', 'Spencer Johnson', 'Matt Henry',
  'Jasprit Bumrah', 'Ashwani Kumar', 'Mohammed Izhar', 'Trent Boult', 'Josh Hazlewood', 'Rasikh Salam', 'Mangesh Yadav',
  'Abhinandan Singh', 'Jacob Duffy', 'Nuwan Thushara', 'Kartik Tyagi', 'Umran Malik', 'Vaibhav Arora', 'Saurabh Dubey',
  'Navdeep Saini', 'Matheesha Pathirana', 'Blessing Muzarabani', 'Pat Cummins', 'Harshal Patel', 'Jaydev Unadkat',
  'Shivam Mavi', 'Sakib Hussain', 'Praful Hinge', 'Brydon Carse', 'David Payne', 'Eshan Malinga', 'Sandeep Sharma',
  'Tushar Deshpande', 'Sushant Mishra', 'Kuldeep Sen', 'Jofra Archer', 'Kwena Maphaka', 'Nandre Burger', 'Adam Milne',
  'Auqib Nabi', 'Mukesh Kumar', 'T Natarajan', 'Mitchell Starc', 'Dushmantha Chameera', 'Lungi Ngidi', 'Kyle Jamieson',
  'Arshdeep Singh', 'Vijaykumar Vyshak', 'Vishal Nishad', 'Yash Thakur', 'Ben Dwarshuis', 'Xavier Bartlett',
  'Marco Jansen', 'Lockie Ferguson', 'Mohammed Siraj', 'Prasidh Krishna', 'Gurnoor Brar', 'Ishant Sharma', 'Ashok Sharma',
  'Kulwant Khejroliya', 'Luke Wood', 'Kagiso Rabada', 'Akash Singh', 'Avesh Khan', 'Mohammed Shami', 'Mohsin Khan',
  'Prince Yadav', 'Mayank Yadav', 'Naman Tiwari', 'Anrich Nortje',
]);

const MEDIUM_BOWLERS = new Set([
  'Shivam Dube', 'Ramakrishna Ghosh', 'Aman Khan', 'Prashant Veer', 'Jamie Overton', 'Zak Foulkes', 'Hardik Pandya',
  'Shardul Thakur', 'Raj Bawa', 'Deepak Chahar', 'Will Jacks', 'Corbin Bosch', 'Sherfane Rutherford', 'Venkatesh Iyer',
  'Romario Shepherd', 'Anukul Roy', 'Ramandeep Singh', 'Cameron Green', 'Nitish Kumar Reddy', 'Kamindu Mendis',
  'Yudhvir Singh', 'Dasun Shanaka', 'Nitish Rana', 'T Vijay', 'Azmatullah Omarzai', 'Cooper Connolly', 'Marcus Stoinis',
  'Mitchell Owen', 'Arshad Khan', 'Jason Holder', 'Arshin Kulkarni', 'Mitchell Marsh',
]);

const BATTING_STYLES = {
  'Ruturaj Gaikwad': 'ANCHOR', 'Sanju Samson': 'ANCHOR', 'MS Dhoni': 'ATTACK', 'Shivam Dube': 'ATTACK',
  'Rohit Sharma': 'ATTACK', 'Suryakumar Yadav': 'SWEEP', 'Tilak Varma': 'ANCHOR', 'Quinton de Kock': 'ATTACK',
  'Rajat Patidar': 'ATTACK', 'Virat Kohli': 'ANCHOR', 'Phil Salt': 'ATTACK', 'Tim David': 'ATTACK',
  'Ajinkya Rahane': 'ANCHOR', 'Rinku Singh': 'ATTACK', 'Sunil Narine': 'ATTACK', 'Rachin Ravindra': 'ANCHOR',
  'Ishan Kishan': 'ATTACK', 'Abhishek Sharma': 'ATTACK', 'Travis Head': 'ATTACK', 'Heinrich Klaasen': 'SWEEP',
  'Riyan Parag': 'ATTACK', 'Yashasvi Jaiswal': 'ATTACK', 'Dhruv Jurel': 'ANCHOR', 'Shimron Hetmyer': 'ATTACK',
  'KL Rahul': 'ANCHOR', 'Prithvi Shaw': 'ATTACK', 'David Miller': 'ATTACK', 'Tristan Stubbs': 'ATTACK',
  'Shreyas Iyer': 'ANCHOR', 'Prabhsimran Singh': 'ATTACK', 'Shashank Singh': 'ATTACK', 'Marcus Stoinis': 'ATTACK',
  'Shubman Gill': 'ANCHOR', 'Sai Sudharsan': 'ANCHOR', 'Jos Buttler': 'ATTACK', 'Rahul Tewatia': 'ATTACK',
  'Rishabh Pant': 'SWEEP', 'Aiden Markram': 'ANCHOR', 'Nicholas Pooran': 'SWEEP', 'Mitchell Marsh': 'ATTACK',
};

const initialsFor = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const statSeed = name => name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

const playerTypeFor = name => {
  if (SPIN_BOWLERS.has(name)) return 'SPIN';
  if (FAST_BOWLERS.has(name)) return 'FAST';
  if (MEDIUM_BOWLERS.has(name)) return 'MEDIUM';
  return 'BAT';
};

const roleFor = type => type === 'BAT' ? 'BAT' : (type === 'MEDIUM' || type === 'SPIN' ? 'ALL' : 'BOWLER');

const buildPlayer = (name, team, id) => {
  const type = playerTypeFor(name);
  const seed = statSeed(name);
  const isBat = type === 'BAT';
  const economyBase = type === 'SPIN' ? 7.1 : type === 'FAST' ? 7.8 : 7.6;
  return {
    id,
    name,
    type,
    team,
    role: roleFor(type),
    economy: isBat ? 0 : +(economyBase + (seed % 9) / 10).toFixed(1),
    wickets: isBat ? 0 : 12 + (seed % 120),
    average: isBat ? 0 : +(22 + (seed % 110) / 10).toFixed(1),
    strikeRate: isBat ? 0 : 15 + (seed % 12),
    formIndex: +(0.58 + (seed % 35) / 100).toFixed(2),
    recentForms: seed % 3 === 0 ? ['G', 'W', 'G', 'A', 'G'] : seed % 3 === 1 ? ['A', 'G', 'W', 'G', 'A'] : ['G', 'A', 'G', 'W', 'G'],
    color: TEAM_COLORS[team],
    initials: initialsFor(name),
  };
};

const ACTIVE_PLAYERS = Object.entries(CURRENT_SQUADS).flatMap(([team, names], teamIndex) =>
  names.map((name, playerIndex) => buildPlayer(name, team, teamIndex * 100 + playerIndex + 1))
);

const ACTIVE_BATTERS = ACTIVE_PLAYERS
  .filter(p => p.role !== 'BOWLER')
  .map(p => ({ team: p.team, name: p.name, style: BATTING_STYLES[p.name] || (p.role === 'ALL' ? 'ATTACK' : 'ANCHOR') }));

const toClientBowler = b => ({
  id: b.id,
  name: b.name,
  type: b.type,
  economy: b.economy,
  average: b.average,
  formScore: b.form_score,
  matchupScore: b.matchup_score,
  conditionsScore: b.conditions_score,
  totalScore: b.total_score,
  reasons: b.reasons || [],
  recentForms: b.recent_forms || [],
  color: b.color_hex || '#00d4aa',
  initials: b.initials || b.name?.slice(0, 2).toUpperCase(),
});

const battingTeamFor = match => match.innings === 1 ? match.team1 : match.team2;
const bowlingTeamFor = match => match.innings === 1 ? match.team2 : match.team1;
const battersFor = team => ACTIVE_BATTERS.filter(b => b.team === team);

const toClientWin = win => ({
  prob: win.prob,
  rrr: win.rrr,
  ballsLeft: win.balls_left,
  runsLeft: win.runs_left,
  label: win.label,
});

// ============================================================
// APP ROOT
// ============================================================
export default function App() {
  const [role,       setRole]       = useState('captain');
  const [activeTab,  setActiveTab]  = useState('dashboard');
  const [players,    setPlayers]    = useState(ACTIVE_PLAYERS);
  const [recs,       setRecs]       = useState(null);
  const [winData,    setWinData]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [alert,      setAlert]      = useState(null);
  const [recTime,    setRecTime]    = useState(null);
  const [history,    setHistory]    = useState([]);
  const [timeline,   setTimeline]   = useState([]);
  const [matchup,    setMatchup]    = useState(null);
  const [matchupLoading, setMatchupLoading] = useState(false);

  const [match, setMatch] = useState({
    team1: 'CSK', team2: 'MI', innings: 2,
    stadium: DB_STADIUMS[0],
    over: 14, runs: 128, wickets: 4, target: 181,
    batter1: 'Rohit Sharma', batter2: 'Suryakumar Yadav', batter1Type: 'ATTACK',
    weather: { temp: 28, humidity: 72, windSpeed: 12, dewFactor: 0.7 },
  });

  const upMatch   = (k, v) => setMatch(m => ({ ...m, [k]: v }));
  const upWeather = (k, v) => setMatch(m => ({ ...m, weather: { ...m.weather, [k]: v } }));

  const flash = (msg, type = 'info') => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 3200);
  };

  useEffect(() => {
    setMatch(m => {
      const options = battersFor(battingTeamFor(m));
      if (!options.length) return m;

      const batter1Valid = options.some(b => b.name === m.batter1);
      const batter2Valid = options.some(b => b.name === m.batter2);
      if (batter1Valid && batter2Valid) return m;

      const nextBatter1 = batter1Valid ? m.batter1 : options[0].name;
      const nextBatter2 = batter2Valid ? m.batter2 : (options[1]?.name || options[0].name);
      const nextStyle = options.find(b => b.name === nextBatter1)?.style || m.batter1Type;
      return { ...m, batter1: nextBatter1, batter2: nextBatter2, batter1Type: nextStyle };
    });
  }, [match.team1, match.team2, match.innings]);

  const recommend = useCallback(async () => {
    setLoading(true);
    setRecs(null);
    const t0 = Date.now();
    const bowlingTeam = bowlingTeamFor(match);
    const eligibleBowlers = players.filter(p => p.team === bowlingTeam && p.type !== 'BAT');

    if (!eligibleBowlers.length) {
      flash(`No bowlers available for ${bowlingTeam}.`, 'warn');
      setLoading(false);
      return;
    }

    try {
      const { data } = await getModelPrediction({
        players: eligibleBowlers,
        stadium: match.stadium,
        weather: match.weather,
        match_state: {
          runs: match.runs,
          wickets: match.wickets,
          over: match.over,
          target: match.target,
          innings: match.innings,
          matchType: 'T20',
          batter1Type: match.batter1Type,
        },
      });
      const ranked = (data.ranked_bowlers || []).map(toClientBowler);
      const wp = toClientWin(data.win_details);
      const elapsed = ((data.response_ms || Date.now() - t0) / 1000).toFixed(2);
      setRecs(ranked);
      setWinData(wp);
      setRecTime(elapsed);
      setTimeline(t => [
        ...t,
        {
          over: match.over,
          runs: match.runs,
          wickets: match.wickets,
          winProbability: wp.prob,
        },
      ].sort((a, b) => a.over - b.over));
      setHistory(h => [{ ...match, ranked, wp, ts: new Date().toLocaleTimeString() }, ...h].slice(0, 8));
      flash(`✅ ${bowlingTeam} model analysis complete in ${elapsed}s — ${ranked[0]?.name || 'no bowler'} recommended`, 'success');
      if (ranked[0]?.name && match.batter1) {
        setMatchupLoading(true);
        try {
          const matchupRes = await getMatchupAnalysis(match.batter1, ranked[0].name);
          setMatchup({
            batter: match.batter1,
            bowler: ranked[0].name,
            ...matchupRes.data,
          });
        } catch (matchupErr) {
          setMatchup(null);
          flash('Matchup data unavailable for this pairing.', 'warn');
        } finally {
          setMatchupLoading(false);
        }
      }
    } catch (err) {
      flash('Model service unavailable. Check that the backend is running on port 8000.', 'warn');
    } finally {
      setLoading(false);
    }
  }, [match, players]);

  return (
    <div className="app">
      <Header role={role} setRole={setRole} activeTab={activeTab} setActiveTab={setActiveTab} />
      {alert && <AlertBar alert={alert} />}

      {activeTab === 'dashboard' && (
        <div className="main">
          <Sidebar match={match} upMatch={upMatch} upWeather={upWeather}
            role={role} loading={loading} onRecommend={recommend} flash={flash} />
          <Content match={match} recs={recs} winData={winData}
            loading={loading} recTime={recTime} timeline={timeline}
            onClearTimeline={() => setTimeline([])}
            matchup={matchup} matchupLoading={matchupLoading} />
        </div>
      )}
      {activeTab === 'players' && (
        <PlayersPage players={players} setPlayers={setPlayers} role={role} flash={flash} />
      )}
      {activeTab === 'history' && (
        <HistoryPage history={history} />
      )}
      {activeTab === 'analytics' && (
        <AnalyticsPage venues={DB_STADIUMS} flash={flash} />
      )}
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────
function Header({ role, setRole, activeTab, setActiveTab }) {
  return (
    <div className="header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-icon">🏏</div>
          <div className="logo-text">Match<span>State</span> AI</div>
        </div>
        <nav className="nav">
          {['dashboard', 'players', 'history', 'analytics'].map(t => (
            <button key={t} className={`nav-btn${activeTab === t ? ' active' : ''}`}
              onClick={() => setActiveTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
      </div>
      <div className="header-right">
        <div className="live-badge"><span className="live-dot" />LIVE</div>
        <select value={role} onChange={e => setRole(e.target.value)} className="role-select">
          <option value="captain">Captain</option>
          <option value="analyst">Analyst</option>
          <option value="admin">Admin</option>
        </select>
        <span className={`role-badge role-${role}`}>{role.toUpperCase()}</span>
      </div>
    </div>
  );
}

function AlertBar({ alert }) {
  return (
    <div className={`alert-bar alert-${alert.type}`}>{alert.msg}</div>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ match, upMatch, upWeather, role, loading, onRecommend, flash }) {
  const battingOptions = battersFor(battingTeamFor(match));
  const pickBatter1 = name => {
    const selected = battingOptions.find(b => b.name === name);
    upMatch('batter1', name);
    if (selected) upMatch('batter1Type', selected.style);
  };

  return (
    <div className="sidebar">
      {/* Match inputs */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Match State</span>
          <span className="card-action" onClick={() => flash('Match data saved', 'success')}>Save</span>
        </div>

        <div className="field-row">
          <Field label="Team 1">
            <select value={match.team1} onChange={e => upMatch('team1', e.target.value)}>
              {IPL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Team 2">
            <select value={match.team2} onChange={e => upMatch('team2', e.target.value)}>
              {IPL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Innings">
          <select value={match.innings} onChange={e => upMatch('innings', +e.target.value)}>
            <option value={1}>1st innings - {match.team1} batting</option>
            <option value={2}>2nd innings - {match.team2} chasing</option>
          </select>
        </Field>

        <div className="team-context">
          <span><b>Batting:</b> {battingTeamFor(match)}</span>
          <span><b>Bowling:</b> {bowlingTeamFor(match)}</span>
        </div>

        <Field label="Venue">
          <select value={match.stadium?.id} onChange={e => upMatch('stadium', DB_STADIUMS.find(s => s.id === +e.target.value))}>
            {DB_STADIUMS.map(s => <option key={s.id} value={s.id}>{s.name}, {s.city}</option>)}
          </select>
        </Field>

        <div className="score-strip">
          <ScorePill val={match.runs}    label="Runs" />
          <ScorePill val={match.wickets} label="Wkts" />
          <ScorePill val={match.over}    label="Overs" />
        </div>

        <div className="field-row">
          <Field label="Runs">    <input type="number" value={match.runs}    onChange={e => upMatch('runs',    +e.target.value || 0)} /></Field>
          <Field label="Wickets"><input type="number" value={match.wickets} onChange={e => upMatch('wickets', +e.target.value || 0)} min="0" max="10" /></Field>
        </div>
        <div className="field-row">
          <Field label="Over (0-20)">   <input type="number" min="0" max={TOTAL_OVERS} value={match.over}   onChange={e => upMatch('over',   parseFloat(e.target.value) || 0)} /></Field>
          <Field label="Target"><input type="number" value={match.target || ''} placeholder="1st inn" onChange={e => upMatch('target', +e.target.value || null)} /></Field>
        </div>

        <div className="divider" />

        <div className="field-row">
          <Field label="Batter 1">
            <select value={match.batter1} onChange={e => pickBatter1(e.target.value)}>
              {battingOptions.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Batter 2">
            <select value={match.batter2} onChange={e => upMatch('batter2', e.target.value)}>
              {battingOptions.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Batter 1 Style">
          <select value={match.batter1Type} onChange={e => upMatch('batter1Type', e.target.value)}>
            <option value="ATTACK">Attack</option>
            <option value="ANCHOR">Anchor</option>
            <option value="SWEEP">Sweep-heavy</option>
          </select>
        </Field>
      </div>

      {/* Weather */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Conditions</span>
          <span className="card-action" onClick={() => flash('Weather refreshed (mock API)', 'info')}>↻ Refresh</span>
        </div>
        <div className="weather-grid">
          <WeatherPill label="Temp"     val={`${match.weather.temp}°C`}       cls="w-temp" />
          <WeatherPill label="Humidity" val={`${match.weather.humidity}%`}    cls="w-humid" />
          <WeatherPill label="Dew"      val={match.weather.dewFactor}          cls="w-dew" />
          <WeatherPill label="Wind"     val={`${match.weather.windSpeed} km/h`} cls="w-wind" />
        </div>
        <div className="slider-row">
          <label className="slider-label">Humidity</label>
          <input type="range" min="30" max="100" value={match.weather.humidity}
            onChange={e => upWeather('humidity', +e.target.value)} className="slider slider-green" />
          <span className="slider-val">{match.weather.humidity}%</span>
        </div>
        <div className="slider-row">
          <label className="slider-label">Dew Factor</label>
          <input type="range" min="0" max="10" value={Math.round(match.weather.dewFactor * 10)}
            onChange={e => upWeather('dewFactor', +e.target.value / 10)} className="slider slider-orange" />
          <span className="slider-val">{match.weather.dewFactor.toFixed(1)}</span>
        </div>
        {match.stadium && (
          <div className="pitch-info">
            <span className="muted">Pitch:</span> {match.stadium.pitchType.toUpperCase()} &nbsp;·&nbsp;
            <span className="muted">Spin:</span> {match.stadium.spinFriendly ? 'Yes' : 'No'} &nbsp;·&nbsp;
            <span className="muted">Boundary:</span> {match.stadium.boundary}m
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={onRecommend} disabled={loading}>
        {loading ? '⚙ Analyzing...' : '🎯 Get Bowler Recommendation'}
      </button>
      {role === 'analyst' && (
        <button className="btn btn-secondary" onClick={() => flash('Match state saved for review', 'success')}>
          💾 Save Match State
        </button>
      )}
    </div>
  );
}

// ── Main Content ─────────────────────────────────────────────────────────────
function Content({ match, recs, winData, loading, recTime, timeline, onClearTimeline, matchup, matchupLoading }) {
  const ballsRemaining = Math.max(0, Math.round((TOTAL_OVERS - match.over) * 6));
  const runsNeeded = match.target ? Math.max(0, match.target - match.runs) : null;
  const battingTeam = battingTeamFor(match);
  const bowlingTeam = bowlingTeamFor(match);
  const phase = match.over < POWERPLAY_END
    ? 'POWERPLAY'
    : match.over < DEATH_START
    ? 'MIDDLE OVERS'
    : 'DEATH OVERS';

  return (
    <div className="content">
      {/* Match bar */}
      <div className="match-bar">
        <div>
          <div className="match-teams">{match.team1} <span>vs</span> {match.team2}</div>
          <div className="match-venue">T20 · {match.stadium?.name}, {match.stadium?.city}</div>
          <div className="match-venue">Batting: {battingTeam} · Bowling: {bowlingTeam}</div>
        </div>
        <div className="match-bar-right">
          {match.target && (
            <div className="chase-info">
              <span className="muted">Target:</span> <b className="amber">{match.target}</b>
              &nbsp;·&nbsp;<span className="muted">Need:</span> <b>{runsNeeded}</b>
              &nbsp;off&nbsp;<b>{ballsRemaining}</b> balls
            </div>
          )}
          <span className="phase-badge">{phase}</span>
        </div>
      </div>

      {/* Win probability */}
      {winData && <WinPanel winData={winData} match={match} />}
      <WinProbabilityTimeline data={timeline} onClear={onClearTimeline} />
      <MatchupPanel matchup={matchup} loading={matchupLoading} striker={match.batter1} topBowler={recs?.[0]?.name} />

      {/* Bowler recommendations */}
      <div className="rec-header">
        <div>
          <div className="rec-title">Bowler <span>Rankings</span></div>
          {recTime && <div className="rec-meta">Generated in {recTime}s · {bowlingTeam} attack · Over {match.over} · {match.wickets} wickets down</div>}
        </div>
        {recs && <div className="formula-note">trained IPL model inference</div>}
      </div>

      {loading && <LoadingState />}

      {!recs && !loading && (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <div className="empty-title">No recommendation yet</div>
          <div className="empty-sub">Input match state and click "Get Bowler Recommendation"</div>
        </div>
      )}

      {recs && recs.map((b, i) => <BowlerCard key={b.id} bowler={b} rank={i + 1} />)}
    </div>
  );
}

function WinPanel({ winData, match }) {
  const cls = winData.prob >= 60 ? 'high' : winData.prob >= 40 ? 'mid' : 'low';
  const barColor = winData.prob >= 60
    ? 'linear-gradient(90deg,#00c896,#00d4aa)'
    : winData.prob >= 40
    ? 'linear-gradient(90deg,#ffd60a,#ff8c00)'
    : 'linear-gradient(90deg,#ff4757,#c0392b)';

  return (
    <div className="win-panel">
      <div className="win-panel-top">
        <div>
          <div className="card-title">Win Probability</div>
          <div className={`win-prob ${cls}`}>{winData.prob}%</div>
          {winData.label && <div className="win-label">{winData.label}</div>}
        </div>
        <div className="win-factors">
          {winData.rrr !== null && (
            <WinFactor val={winData.rrr}
              color={winData.rrr < 7 ? 'var(--green)' : winData.rrr < 10 ? 'var(--accent4)' : 'var(--red)'}
              label="Req. Rate" />
          )}
          <WinFactor val={winData.ballsLeft} label="Balls Left" />
          {winData.runsLeft !== null && <WinFactor val={winData.runsLeft} color="var(--accent4)" label="Runs Needed" />}
          <WinFactor val={10 - match.wickets} color="var(--accent)" label="Wkts Left" />
        </div>
      </div>
      <div className="win-gauge-track">
        <div className="win-gauge-fill" style={{ width: `${winData.prob}%`, background: barColor }} />
      </div>
    </div>
  );
}

function WinFactor({ val, label, color = 'var(--text)' }) {
  return (
    <div className="win-factor">
      <div className="wf-val" style={{ color }}>{val}</div>
      <div className="wf-label">{label}</div>
    </div>
  );
}

function WinProbabilityTimeline({ data, onClear }) {
  return (
    <div className="analysis-panel">
      <div className="analysis-head">
        <div>
          <div className="card-title">Win Probability Timeline</div>
          <div className="analysis-sub">Session history updates after each prediction</div>
        </div>
        <button className="btn-sm btn-ghost" onClick={onClear} disabled={!data.length}>Clear Timeline</button>
      </div>
      <div className="timeline-chart">
        {data.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 12, right: 16, left: -16, bottom: 6 }}>
              <CartesianGrid stroke="rgba(139,163,192,0.12)" vertical={false} />
              <XAxis dataKey="over" stroke="var(--text3)" tick={{ fontSize: 11 }} label={{ value: 'Over', position: 'insideBottom', offset: -4, fill: 'var(--text3)', fontSize: 11 }} />
              <YAxis domain={[0, 100]} stroke="var(--text3)" tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <Tooltip content={<TimelineTooltip />} />
              <Line type="monotone" dataKey="winProbability" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--accent)' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">Generate predictions to build the win probability timeline.</div>
        )}
      </div>
    </div>
  );
}

function TimelineTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div>Over {point.over}</div>
      <div>Score {point.runs}/{point.wickets}</div>
      <div className="accent">{point.winProbability}% win probability</div>
    </div>
  );
}

function MatchupPanel({ matchup, loading, striker, topBowler }) {
  const status = matchup ? matchupStatus(matchup) : null;

  return (
    <div className="analysis-panel">
      <div className="analysis-head">
        <div>
          <div className="card-title">Batter vs Bowler Matchup</div>
          <div className="analysis-sub">{striker && topBowler ? `${striker} against ${topBowler}` : 'Shown after a recommendation is generated'}</div>
        </div>
        {status && <span className={`status-pill status-${status.kind}`}>{status.label}</span>}
      </div>
      {loading && <div className="mini-loading">Loading matchup history...</div>}
      {!loading && !matchup && <div className="chart-empty compact">No matchup selected yet.</div>}
      {!loading && matchup && (
        <>
          <div className="metric-grid four">
            <MetricCard label="Runs" value={matchup.runs} />
            <MetricCard label="Balls" value={matchup.balls} />
            <MetricCard label="Strike Rate" value={matchup.strike_rate} />
            <MetricCard label="Dismissals" value={matchup.dismissals} />
          </div>
          <div className="insight-line">
            {matchup.batter} has scored {matchup.runs} runs from {matchup.balls} balls against {matchup.bowler} and has been dismissed {matchup.dismissals} times.
          </div>
        </>
      )}
    </div>
  );
}

function matchupStatus(stats) {
  if (stats.balls < 6) return { kind: 'balanced', label: 'Limited sample' };
  if (stats.dismissals >= 2 || stats.strike_rate < 105) return { kind: 'bowler', label: 'Bowler advantage' };
  if (stats.strike_rate >= 145 && stats.dismissals === 0) return { kind: 'batter', label: 'Batter advantage' };
  return { kind: 'balanced', label: 'Balanced' };
}

// ── Bowler Card ──────────────────────────────────────────────────────────────
function BowlerCard({ bowler, rank }) {
  const [expanded, setExpanded] = useState(rank === 1);
  const rankCls = rank <= 3 ? `rank-${rank}` : 'rank-other';

  return (
    <div className={`bowler-card ${rankCls}`} onClick={() => setExpanded(e => !e)}>
      <div className={`rank-badge rb-${rank <= 3 ? rank : 'other'}`}>{rank}</div>

      <div className="bowler-top">
        <div className="bowler-avatar" style={{ background: `${bowler.color}22`, color: bowler.color, border: `1px solid ${bowler.color}44` }}>
          {bowler.initials}
        </div>
        <div className="bowler-info">
          <div className="bowler-name">{bowler.name}</div>
          <div className="bowler-meta">{bowler.type} &nbsp;·&nbsp; Econ {bowler.economy} &nbsp;·&nbsp; Avg {bowler.average}</div>
        </div>
        <div className="bowler-score-box">
          <div className="bowler-score-val" style={{ color: rank === 1 ? 'var(--accent)' : rank === 2 ? 'var(--accent2)' : 'var(--text)' }}>
            {Math.round(bowler.totalScore * 100)}
          </div>
          <div className="bowler-score-label">SCORE</div>
        </div>
      </div>

      <ScoreBar label="Form Index"        val={bowler.formScore}       color="#00d4aa" />
      <ScoreBar label="Matchup Score"     val={bowler.matchupScore}    color="#4da6ff" />
      <ScoreBar label="Conditions Score"  val={bowler.conditionsScore} color="#ffd60a" />

      {expanded && (
        <>
          <ScoreBar label="Model Score" val={bowler.totalScore} color="#ff6b35" />
          <div className="reasons">
            {bowler.reasons.map((r, i) => (
              <div key={i} className="reason-item"><span className="reason-dot" />{r}</div>
            ))}
          </div>
          <div className="form-pips">
            {bowler.recentForms.map((f, i) => (
              <div key={i} className={`pip pip-${f === 'W' ? 'w' : f === 'G' ? 'g' : 'a'}`}>{f}</div>
            ))}
            <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>Last 5</span>
          </div>
        </>
      )}
    </div>
  );
}

function ScoreBar({ label, val, color }) {
  return (
    <div className="score-bar">
      <div className="score-bar-row">
        <span className="score-bar-label">{label}</span>
        <span className="score-bar-val" style={{ color }}>{Math.round(val * 100)}/100</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${val * 100}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Players Page ─────────────────────────────────────────────────────────────
function PlayersPage({ players, setPlayers, role, flash }) {
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const startEdit = p => { setEditId(p.id); setEditForm({ ...p }); };
  const saveEdit  = () => {
    setPlayers(ps => ps.map(p => p.id === editId ? { ...p, ...editForm, formIndex: parseFloat(editForm.formIndex) } : p));
    setEditId(null);
    flash('Player updated', 'success');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Player <span>Database</span></div>
        {role === 'admin' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-sm btn-outline" onClick={() => flash('CSV format: name,type,economy,avg,wickets,formIndex', 'info')}>📤 Import CSV</button>
            <button className="btn-sm btn-outline" onClick={() => flash('Players exported', 'success')}>📥 Export CSV</button>
          </div>
        )}
      </div>

      <div className="table-wrap">
        <table className="player-table">
          <thead>
            <tr>
              <th>Player</th><th>Team</th><th>Role</th><th>Type</th><th>Economy</th><th>Avg</th>
              <th>Wickets</th><th>Form Index</th><th>Recent Form</th>
              {role === 'admin' && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {players.map(p => editId === p.id ? (
              <tr key={p.id} className="editing-row">
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>
                  <select value={editForm.team} onChange={e => setEditForm(f => ({ ...f, team: e.target.value }))} className="mini-select">
                    {IPL_TEAMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </td>
                <td>
                  <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className="mini-select">
                    <option>BOWLER</option><option>ALL</option><option>BAT</option>
                  </select>
                </td>
                <td>
                  <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} className="mini-select">
                    <option>FAST</option><option>SPIN</option><option>MEDIUM</option><option>BAT</option>
                  </select>
                </td>
                <td><input type="number" step="0.1" value={editForm.economy} onChange={e => setEditForm(f => ({ ...f, economy: parseFloat(e.target.value) }))} className="mini-input" /></td>
                <td><input type="number" step="0.1" value={editForm.average} onChange={e => setEditForm(f => ({ ...f, average: parseFloat(e.target.value) }))} className="mini-input" /></td>
                <td>{p.wickets}</td>
                <td><input type="number" step="0.01" min="0" max="1" value={editForm.formIndex} onChange={e => setEditForm(f => ({ ...f, formIndex: parseFloat(e.target.value) }))} className="mini-input" /></td>
                <td><FormPips forms={p.recentForms} /></td>
                <td>
                  <button onClick={saveEdit} className="btn-sm btn-green">Save</button>
                  <button onClick={() => setEditId(null)} className="btn-sm btn-ghost" style={{ marginLeft: 4 }}>Cancel</button>
                </td>
              </tr>
            ) : (
              <tr key={p.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="p-avatar" style={{ background: `${p.color}22`, color: p.color, border: `1px solid ${p.color}44` }}>{p.initials}</div>
                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                  </div>
                </td>
                <td><span className="team-badge">{p.team}</span></td>
                <td><span className="type-badge">{p.role}</span></td>
                <td><span className="type-badge">{p.type}</span></td>
                <td className={`mono ${p.economy < 6.5 ? 'green' : p.economy < 7.5 ? 'amber' : 'red'}`}>{p.economy}</td>
                <td className="mono">{p.average}</td>
                <td className="mono accent">{p.wickets}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="form-mini-bar">
                      <div style={{ height: '100%', width: `${p.formIndex * 100}%`, background: 'linear-gradient(90deg,var(--accent),var(--green))', borderRadius: 2 }} />
                    </div>
                    <span className="mono">{Math.round(p.formIndex * 100)}</span>
                  </div>
                </td>
                <td><FormPips forms={p.recentForms} /></td>
                {role === 'admin' && <td><button onClick={() => startEdit(p)} className="btn-sm btn-ghost">Edit</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {role === 'admin' && (
        <div className="upload-area" onClick={() => flash('Upload a player_data.csv file', 'info')}>
          <div style={{ fontSize: 28, opacity: 0.4, marginBottom: 8 }}>📤</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>Click to upload player CSV</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 4 }}>name, type, economy, average, wickets, formIndex</div>
        </div>
      )}
    </div>
  );
}

function FormPips({ forms }) {
  return (
    <div className="form-pips" style={{ margin: 0 }}>
      {forms.map((f, i) => (
        <div key={i} className={`pip pip-${f === 'W' ? 'w' : f === 'G' ? 'g' : 'a'}`} style={{ fontSize: 9 }}>{f}</div>
      ))}
    </div>
  );
}

// ── Analytics Page ──────────────────────────────────────────────────────────
function AnalyticsPage({ venues, flash }) {
  const [availableVenues, setAvailableVenues] = useState(venues.map(v => v.name));
  const [selectedVenue, setSelectedVenue] = useState(venues[0]?.name || '');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAnalyticsVenues()
      .then(({ data }) => {
        if (!cancelled && data.venues?.length) {
          setAvailableVenues(data.venues);
          setSelectedVenue(current => data.venues.includes(current) ? current : data.venues[0]);
        }
      })
      .catch(() => flash('Could not load venue list from backend analytics.', 'warn'));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedVenue) return;
    let cancelled = false;
    setLoading(true);
    getVenueAnalytics(selectedVenue)
      .then(({ data }) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) {
          setAnalytics(null);
          flash('Venue analytics unavailable for this venue.', 'warn');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedVenue]);

  const inningsData = analytics ? [
    { name: '1st Innings', score: analytics.avg_first_innings },
    { name: '2nd Innings', score: analytics.avg_second_innings },
  ] : [];
  const wicketData = analytics ? [
    { name: 'Pace', value: analytics.pace_wickets_pct, color: '#4da6ff' },
    { name: 'Spin', value: analytics.spin_wickets_pct, color: '#ffd60a' },
  ] : [];

  return (
    <div className="page analytics-page">
      <div className="page-header">
        <div>
          <div className="page-title">Venue <span>Analytics</span></div>
          <div className="analysis-sub">Cricsheet IPL venue trends from historical matches</div>
        </div>
        <Field label="Venue">
          <select value={selectedVenue} onChange={e => setSelectedVenue(e.target.value)}>
            {availableVenues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </Field>
      </div>

      {loading && <LoadingState />}
      {!loading && !analytics && <div className="empty-state"><div className="empty-title">No analytics available</div></div>}
      {!loading && analytics && (
        <>
          <div className="metric-grid">
            <MetricCard label="Avg 1st Innings" value={analytics.avg_first_innings} />
            <MetricCard label="Avg 2nd Innings" value={analytics.avg_second_innings} />
            <MetricCard label="Chasing Win %" value={`${analytics.chasing_win_pct}%`} />
            <MetricCard label="Highest Chase" value={analytics.highest_successful_chase} />
            <MetricCard label="Matches" value={analytics.matches_played} />
          </div>

          <div className="analytics-layout">
            <div className="analysis-panel">
              <div className="card-title">Innings Scoring Profile</div>
              <div className="analytics-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={inningsData} margin={{ top: 18, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(139,163,192,0.12)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text3)" tick={{ fontSize: 11 }} />
                    <YAxis stroke="var(--text3)" tick={{ fontSize: 11 }} />
                    <Tooltip content={<SimpleTooltip suffix=" runs" />} />
                    <Bar dataKey="score" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="analysis-panel">
              <div className="card-title">Wicket Type Split</div>
              <div className="analytics-chart">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={wicketData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4}>
                      {wicketData.map(item => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip content={<SimpleTooltip suffix="%" />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="legend-row">
                  {wicketData.map(item => <span key={item.name}><i style={{ background: item.color }} />{item.name}: {item.value}%</span>)}
                </div>
              </div>
            </div>
          </div>

          <div className="analysis-panel">
            <div className="card-title">Generated Venue Insights</div>
            <div className="insight-list">
              <div className="insight-line">Teams chasing win {analytics.chasing_win_pct}% of matches at this venue.</div>
              <div className="insight-line">Fast bowlers take {analytics.pace_wickets_pct}% of wickets.</div>
              <div className="insight-line">Average first innings score is {analytics.avg_first_innings}.</div>
              <div className="insight-line">Highest successful chase in the dataset is {analytics.highest_successful_chase}.</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

function SimpleTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  return (
    <div className="chart-tooltip">
      <div>{label || point.name}</div>
      <div className="accent">{point.value}{suffix}</div>
    </div>
  );
}

// ── History Page ─────────────────────────────────────────────────────────────
function HistoryPage({ history }) {
  if (!history.length) return (
    <div className="empty-state" style={{ flex: 1 }}>
      <div className="empty-icon">📋</div>
      <div className="empty-title">No history yet</div>
      <div className="empty-sub">Generate recommendations from the dashboard</div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-title" style={{ marginBottom: 20 }}>Recommendation <span>History</span></div>
      {history.map((h, i) => (
        <div key={i} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>{h.team1} vs {h.team2}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>{h.ts}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)', marginBottom: 10 }}>
            <span>Over: <b style={{ color: 'var(--text)' }}>{h.over}</b></span>
            <span>Score: <b style={{ color: 'var(--text)' }}>{h.runs}/{h.wickets}</b></span>
            {h.target && <span>Target: <b style={{ color: 'var(--accent4)' }}>{h.target}</b></span>}
            <span>Win%: <b style={{ color: h.wp.prob >= 60 ? 'var(--green)' : 'var(--accent4)' }}>{h.wp.prob}%</b></span>
          </div>
          {h.ranked?.slice(0, 2).map((b, bi) => (
            <div key={bi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg2)', borderRadius: 'var(--r)', marginBottom: 4 }}>
              <div className="p-avatar" style={{ width: 24, height: 24, fontSize: 9, background: `${b.color}22`, color: b.color, border: `1px solid ${b.color}44` }}>{b.initials}</div>
              <span style={{ fontWeight: 600, flex: 1 }}>{b.name}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>{b.type}</span>
              <span className="mono" style={{ fontSize: 13, color: bi === 0 ? 'var(--accent)' : 'var(--text2)', fontWeight: 700 }}>{Math.round(b.totalScore * 100)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Shared tiny components ───────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function ScorePill({ val, label }) {
  return (
    <div className="score-pill">
      <div className="score-pill-val">{val}</div>
      <div className="score-pill-label">{label}</div>
    </div>
  );
}

function WeatherPill({ label, val, cls }) {
  return (
    <div className="weather-pill">
      <div className="w-label">{label}</div>
      <div className={`w-val ${cls}`}>{val}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <div className="loading-text">Running trained model...</div>
      <div className="loading-sub">Scoring the live match state against IPL training data</div>
    </div>
  );
}
