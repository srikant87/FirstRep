// Basic content library for prototype
const WORKOUT_LIBRARY = {
  knee: [
    { id: 'k1', name: 'Quad Sets', focus: 'reduce_pain', sets: 3, reps: 12, hold: '2s', note: 'Activate quads without knee load.' },
    { id: 'k2', name: 'Straight Leg Raises', focus: 'increase_mobility', sets: 3, reps: 10, hold: '2s', note: 'Build strength with minimal flexion.' },
    { id: 'k3', name: 'Heel Slides', focus: 'increase_mobility', sets: 3, reps: 12, hold: '1s', note: 'Gentle ROM improvement.' },
    { id: 'k4', name: 'Wall Squats (Partial)', focus: 'return_to_sport', sets: 3, reps: 8, hold: '3s', note: 'Strengthen safely; stop if pain >3/10.' },
    { id: 'k5', name: 'Hamstring Stretch', focus: 'reduce_pain', sets: 2, reps: 30, hold: 'sec', note: 'Ease posterior tightness.' }
  ],
  lower_back: [
    { id: 'lb1', name: 'Pelvic Tilts', focus: 'reduce_pain', sets: 3, reps: 10, hold: '3s', note: 'Core activation to offload spine.' },
    { id: 'lb2', name: 'Cat-Camel', focus: 'increase_mobility', sets: 2, reps: 12, hold: '1s', note: 'Gentle spinal mobility.' },
    { id: 'lb3', name: 'Bird-Dog', focus: 'return_to_sport', sets: 3, reps: 8, hold: '2s', note: 'Stability and control.' },
    { id: 'lb4', name: 'Child’s Pose', focus: 'reduce_pain', sets: 2, reps: 45, hold: 'sec', note: 'Decompress and relax.' }
  ],
  shoulder: [
    { id: 's1', name: 'Pendulum Swings', focus: 'reduce_pain', sets: 2, reps: 30, hold: 'sec', note: 'Unload and mobilize.' },
    { id: 's2', name: 'Isometric External Rotation', focus: 'increase_mobility', sets: 3, reps: 10, hold: '5s', note: 'Rotator cuff activation.' },
    { id: 's3', name: 'Wall Slides', focus: 'increase_mobility', sets: 3, reps: 12, hold: '1s', note: 'Scapular control & ROM.' },
    { id: 's4', name: 'Scaption Raises (Light)', focus: 'return_to_sport', sets: 3, reps: 10, hold: '2s', note: 'Functional strengthening.' }
  ],
  neck: [
    { id: 'n1', name: 'Chin Tucks', focus: 'reduce_pain', sets: 3, reps: 10, hold: '5s', note: 'Posture reset.' },
    { id: 'n2', name: 'Upper Trapezius Stretch', focus: 'increase_mobility', sets: 2, reps: 30, hold: 'sec', note: 'Tension relief.' },
    { id: 'n3', name: 'Isometric Side Flexion', focus: 'return_to_sport', sets: 2, reps: 8, hold: '5s', note: 'Neck stability.' }
  ],
  elbow: [
    { id: 'e1', name: 'Wrist Extensor Stretch', focus: 'reduce_pain', sets: 2, reps: 30, hold: 'sec', note: 'Common for tennis elbow.' },
    { id: 'e2', name: 'Eccentric Wrist Extension', focus: 'increase_mobility', sets: 3, reps: 12, hold: '2s', note: 'Tendon rehab driver.' },
    { id: 'e3', name: 'Isometric Grip', focus: 'reduce_pain', sets: 3, reps: 10, hold: '5s', note: 'Pain-modulating isometrics.' }
  ],
  ankle: [
    { id: 'a1', name: 'Alphabet Ankle', focus: 'increase_mobility', sets: 1, reps: 26, hold: '1s', note: 'ROM through letters.' },
    { id: 'a2', name: 'Calf Raises', focus: 'return_to_sport', sets: 3, reps: 12, hold: '1s', note: 'Strength & tendon load.' },
    { id: 'a3', name: 'Towel Stretch', focus: 'reduce_pain', sets: 2, reps: 30, hold: 'sec', note: 'Flexibility & relief.' }
  ]
};

const PHYSIOS = [
  { id: 'p1', name: 'Nhehern PT', price: 399, rating: 4.9, exp: '8 yrs', link: 'tel:+919999999999' },
  { id: 'p2', name: 'Jonah DPT', price: 349, rating: 4.7, exp: '6 yrs', link: 'https://wa.me/19999999999' },
  { id: 'p3', name: 'Niranjan PT', price: 299, rating: 4.8, exp: '7 yrs', link: 'tel:+918888888888' }
];
