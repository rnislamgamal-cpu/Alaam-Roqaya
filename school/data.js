'use strict';
// Curriculum intentionally cleared for a fresh start.
const SUBJECTS=[];
const ALL_SUBJECTS=[];
const LEGACY_ASSESSMENTS=[];
const GUIDED_LESSONS=[];
const BOOK_LESSONS=[];
const READING_PATH=[];
const CURRICULUM={weeks:[],assessment:[]};
const Curriculum={
 defaults(){return {track:'beginner',week:0,day:0,ratings:{}};},
 lesson(id){for(const subject of ALL_SUBJECTS){const lesson=subject.lessons.find(x=>x.id===id);if(lesson)return {subject,lesson};}return null;},
 valid(c){if(!c||!['beginner','practice'].includes(c.track)||!Number.isInteger(c.week)||c.week<0||c.week>11||!Number.isInteger(c.day)||c.day<0||c.day>4||(c.ratings!==undefined&&(typeof c.ratings!=='object'||!c.ratings||Array.isArray(c.ratings))))return false;return Object.entries(c.ratings||{}).every(([key,r])=>(this.lesson(key)||CURRICULUM.assessment.some(a=>a.id===key)||LEGACY_ASSESSMENTS.includes(key))&&r&&[1,2,3].includes(r.level)&&Number.isInteger(r.days)&&r.days>=0&&r.days<=2&&/^\d{4}-\d{2}-\d{2}$/.test(r.date));},
 day(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');},
 rate(course,id,level,date=this.day()){const old=course.ratings?.[id];const days=level===3?Math.min(2,old?.level===3?(old.days+(old.date!==date?1:0)):1):0;return {...course,ratings:{...course.ratings,[id]:{level,days,date}}};},
 mastered(course,id){const r=course.ratings?.[id];return r?.level===3&&r.days>=2;},
 missing(course,id){return (this.lesson(id)?.lesson.prereq||[]).filter(x=>!this.mastered(course,x));},
 review(course){return Object.keys(course.ratings||{}).filter(id=>this.lesson(id)?.subject.id==='arabic'&&!this.mastered(course,id));},
 canAdvance(course){return (CURRICULUM.weeks[course.week]?.lessons||[]).every(id=>this.mastered(course,id));},
 label(level){return {1:'تَحْتَاجُ إِلَى تَدْرِيبٍ',2:'تُؤَدِّيهَا بِمُسَاعَدَةٍ',3:'تُؤَدِّيهَا وَحْدَهَا'}[level]||'لَمْ نُجَرِّبْ بَعْدُ';}
};

function bare(s){return String(s).replace(/[\u064b-\u065f\u0670]/g,'');}
function arText(s){return String(s);}
function digits(s){return String(s).replace(/[0-9]/g,n=>'٠١٢٣٤٥٦٧٨٩'[n]);}
