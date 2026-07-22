/**
 * ADMIN-ONLY. Contains the answer key. Never load this file from the candidate-facing
 * page (sp-portal/assessment) — only vetting-admin/index.html references it. The
 * candidate page only ever sees stripped questions via releaseQuestions().
 *
 * Static-site caveat: since there is no backend, this is still a plain file reachable
 * by direct URL — the real guarantee here is bundle separation (the candidate page's
 * own script tags never include this file), not server-side access control.
 */
(function (global) {
  'use strict';

  var BANK_ID = 'driver-basics-v1';

  var BANK = [
    { id: 'hc1', category: 'Highway Code', question: 'What does a solid white line in the middle of the road mean?', options: ['You may cross to overtake if safe', 'You must not cross or straddle it unless entering a side road', 'It marks a cycle lane', 'It indicates a pedestrian crossing ahead'], answer: 1, explanation: 'A solid white line means you must not cross or straddle it unless you are entering a side road or property, or overtaking a stationary vehicle.' },
    { id: 'hc2', category: 'Highway Code', question: 'When approaching a zebra crossing with pedestrians waiting, you should:', options: ['Sound your horn to warn them', 'Speed up to pass before they step out', 'Slow down and be prepared to stop', 'Only stop if a police officer is present'], answer: 2, explanation: 'Drivers must slow down and be prepared to stop for pedestrians waiting to cross at a zebra crossing.' },
    { id: 'hc3', category: 'Highway Code', question: 'The maximum speed limit for a van on a single carriageway road (unless signed otherwise) is:', options: ['50 mph', '60 mph', '70 mph', '40 mph'], answer: 1, explanation: 'Vans are generally limited to 60 mph on single carriageways unless a lower limit is signed.' },
    { id: 'hc4', category: 'Highway Code', question: 'What should you do when a traffic light shows red and amber together?', options: ['Prepare to go, but do not pass until green shows', 'Go immediately', 'Stop and wait for green', 'Treat it as a give way'], answer: 0, explanation: 'Red and amber together means the lights are about to change to green — prepare to move off but do not go yet.' },

    { id: 'nm1', category: 'Numeracy', question: 'A delivery route covers 45 miles and takes 1.5 hours. What is the average speed?', options: ['20 mph', '30 mph', '45 mph', '15 mph'], answer: 1, explanation: '45 miles ÷ 1.5 hours = 30 mph average speed.' },
    { id: 'nm2', category: 'Numeracy', question: 'A van can carry 24 parcels per trip. How many trips are needed for 150 parcels?', options: ['5', '6', '7', '8'], answer: 2, explanation: '150 ÷ 24 = 6.25, which rounds up to 7 trips since a partial trip is still a trip.' },
    { id: 'nm3', category: 'Numeracy', question: 'If fuel costs £1.48 per litre and a van uses 60 litres per week, what is the weekly fuel cost?', options: ['£74.40', '£88.80', '£64.80', '£96.20'], answer: 1, explanation: '£1.48 × 60 litres = £88.80.' },

    { id: 'mr1', category: 'Map Reading & Route Planning', question: 'On a map, what does a blue line typically represent?', options: ['A motorway', 'A river or waterway', 'A footpath', 'A county boundary'], answer: 1, explanation: 'Blue lines on standard maps typically represent rivers, canals or other waterways.' },
    { id: 'mr2', category: 'Map Reading & Route Planning', question: 'When planning a multi-drop route, which factor is most important to minimise wasted mileage?', options: ['Delivering alphabetically by customer name', 'Grouping drops by geographic proximity', 'Delivering the heaviest parcel first', 'Following the same route every day regardless of drops'], answer: 1, explanation: 'Grouping stops by geographic proximity reduces backtracking and wasted mileage.' },

    { id: 'cs1', category: 'Customer Service', question: 'A customer is not home for a delivery requiring a signature. You should:', options: ['Leave the parcel on the doorstep and leave', 'Follow the company\'s official failed-delivery procedure (e.g., card left, safe place rules)', 'Take the parcel back without any record', 'Ask a neighbour to sign on the customer\'s behalf without checking company policy'], answer: 1, explanation: 'Always follow the official failed-delivery procedure to protect both the customer and the company.' },
    { id: 'cs2', category: 'Customer Service', question: 'A customer is upset about a late delivery. The best first response is:', options: ['Argue that the delay was not your fault', 'Listen, apologise for the inconvenience, and explain next steps calmly', 'Ignore the complaint and move to the next delivery', 'Tell the customer to complain to head office themselves'], answer: 1, explanation: 'Listening, apologising for the inconvenience, and explaining next steps de-escalates the situation professionally.' },

    { id: 'hc5', category: 'Highway Code', question: 'What is the national speed limit for cars and vans on a motorway?', options: ['60 mph', '70 mph', '80 mph', '50 mph'], answer: 1, explanation: 'The national speed limit on motorways for cars and vans is 70 mph.' }
  ];

  function releaseQuestions() {
    return BANK.map(function (q) {
      return { id: q.id, category: q.category, question: q.question, options: q.options.slice() };
    });
  }

  function gradeAssessment(answers) {
    answers = answers || {};
    var byCategory = {};
    var correct = 0;

    BANK.forEach(function (q) {
      var selected = answers[q.id];
      var isCorrect = selected === q.answer;
      if (isCorrect) correct++;
      if (!byCategory[q.category]) byCategory[q.category] = { correct: 0, total: 0 };
      byCategory[q.category].total++;
      if (isCorrect) byCategory[q.category].correct++;
    });

    var total = BANK.length;
    return {
      correct: correct,
      total: total,
      percent: total === 0 ? 0 : Math.round((correct / total) * 100),
      byCategory: byCategory
    };
  }

  function reviewAssessmentAnswers(answers) {
    answers = answers || {};
    return BANK.map(function (q) {
      var selected = Object.prototype.hasOwnProperty.call(answers, q.id) ? answers[q.id] : null;
      return {
        id: q.id,
        category: q.category,
        question: q.question,
        options: q.options.slice(),
        selectedIndex: selected,
        correctIndex: q.answer,
        explanation: q.explanation,
        isCorrect: selected === q.answer
      };
    });
  }

  global.AssessmentBank = {
    BANK_ID: BANK_ID,
    releaseQuestions: releaseQuestions,
    gradeAssessment: gradeAssessment,
    reviewAssessmentAnswers: reviewAssessmentAnswers
  };
})(window);
