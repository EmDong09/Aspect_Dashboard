/* Sample data for the Aspect dashboard prototype.
   Metric values keep the Figma placeholders (xx, x.x / 5, xxK) on purpose:
   they mark where real benchmark numbers will appear. Skill names, file names,
   levels and dates mirror the Figma screens. Nothing here is real test output. */
(function () {
  const LOWER_THIRD_PROMPT =
    'Create a 6-second lower-third for a speaker named Maya Chen, Head of Design. Slide in from the left on a brand-blue bar, hold for 4 seconds, then fade out. Use Instrument Sans, white text. Keep the name on one line with the title below it at a smaller size, and leave 48px of safe margin from the bottom and left edges of the frame.';

  const PROMPTS = {
    'lower-third': LOWER_THIRD_PROMPT,
    'crossfade': 'Blend the interview clip into the B-roll over 1 second with a linear crossfade. Keep audio continuous across the cut.',
    'logo-shape-assembly': 'Animate three simple shapes flying in from the edges and snapping together to form the logo, then hold on the finished mark for 2 seconds.',
    'find-footage': 'Find a 5-second clip of a city street at dusk in the footage library and place it on the main timeline at 00:00.',
    'kinetic-type': 'Animate the line "Move fast, stay kind" word by word, with each word scaling in on the beat. Bold sans serif on a dark background.',
    'map-route-reveal': 'Reveal a route line from San Francisco to Oakland on the map over 3 seconds, ending with a pin drop at the destination.',
    'product-explainer': 'Build a 15-second storyboard explaining the product in three beats: problem, feature, call to action. Use the brand palette.',
    'caption-sync': 'Add captions that match the spoken audio, two lines max, centered at the bottom with a soft shadow.'
  };

  const FEEDBACK = {
    'lower-third': ['The slide-in easing feels natural and the type hierarchy is clear.', 'Cuts out instead of fading. Title text slightly small.'],
    'crossfade': ['The blend timing feels smooth.', 'Audio dips during the transition.'],
    'logo-shape-assembly': ['Shapes land in the right place.', 'Layers are flattened, so the shapes are hard to edit.'],
    'find-footage': ['Picked a clip that fits the mood.', 'Clip runs slightly short of 5 seconds.'],
    'kinetic-type': ['Words hit the beat well.', 'Last word could hold a little longer.'],
    'map-route-reveal': ['Route line looks clean.', 'Pin drop is missing at the end.'],
    'product-explainer': ['The three beats read clearly.', 'Text layers are not editable.'],
    'caption-sync': ['Captions line up with speech.', 'Shadow is a bit heavy.']
  };

  const skills = [
    { id: 's1', name: 'lower-third', desc: 'Name and title text at the bottom of the screen', tests: 'xx', levels: ['Single', 'Combined'], best: 'x.x / 5', cost: '$x.xx', last: '12m ago' },
    { id: 's2', name: 'crossfade', desc: 'A smooth blend from one clip into the next', tests: 'xx', levels: ['Single', 'Combined'], best: 'x.x / 5', cost: '$x.xx', last: '1h ago' },
    { id: 's3', name: 'logo-shape-assembly', desc: 'Simple shapes that move together to build a logo', tests: 'xx', levels: ['Single', 'Combined'], best: 'x.x / 5', cost: '$x.xx', last: '3h ago' },
    { id: 's4', name: 'find-footage', desc: 'Picks the right clip from a footage library', tests: 'xx', levels: ['Single'], best: 'x.x / 5', cost: '$x.xx', last: '5h ago' },
    { id: 's5', name: 'kinetic-type', desc: 'Animated text that moves to match what it says', tests: 'xx', levels: ['Storyboard'], best: 'x.x / 5', cost: '$x.xx', last: 'yesterday' },
    { id: 's6', name: 'caption-sync', desc: 'Captions timed to match the spoken audio', tests: 'x', levels: ['Single'], best: 'x.x / 5', cost: '$x.xx', last: '4d ago' }
  ];

  // [file, skills, version, level, complete, editable, best, date, time]
  const rows = [
    ['lower-third_v4.mp4', ['lower-third'], 4, 'Single', 'Pass', 'Yes', true, '2026-11-08', '2:14pm'],
    ['crossfade_v2.mp4', ['crossfade'], 2, 'Single', 'Fail', 'Yes', false, '2026-11-08', '1:02pm'],
    ['logo-shape-assembly_v3.mp4', ['logo-shape-assembly'], 3, 'Combined', 'Pass', 'No', true, '2026-11-08', '11:40am'],
    ['find-footage_v2.mp4', ['find-footage'], 2, 'Single', 'Pass', 'Yes', false, '2026-11-08', '9:15am'],
    ['kinetic-type_v1.mp4', ['kinetic-type'], 1, 'Storyboard', 'Pass', 'Yes', true, '2026-11-07', '4:48pm'],
    ['lt-crossfade_v1.mp4', ['lower-third', 'crossfade'], 1, 'Combined', 'Pass', 'Yes', false, '2026-11-07', '3:20pm'],
    ['map-route-reveal_v3.mp4', ['map-route-reveal'], 3, 'Single', 'Fail', 'Yes', false, '2026-11-06', '5:05pm'],
    ['product-explainer_v2.mp4', ['product-explainer'], 2, 'Storyboard', 'Pass', 'No', false, '2026-11-06', '10:30am'],
    ['logo-shape-assembly_v1.mp4', ['logo-shape-assembly'], 1, 'Single', 'Pass', 'Yes', false, '2026-11-05', '2:45pm'],
    ['caption-sync_v1.mp4', ['caption-sync'], 1, 'Single', 'Pass', 'Yes', true, '2026-11-04', '6:10pm'],
    ['lower-third_v3.mp4', ['lower-third'], 3, 'Single', 'Pass', 'Yes', false, '2026-11-04', '1:12pm'],
    ['crossfade_v1.mp4', ['crossfade'], 1, 'Single', 'Fail', 'No', false, '2026-11-03', '4:00pm'],
    ['intro-sequence_v1.mp4', ['lower-third', 'crossfade'], 1, 'Storyboard', 'Pass', 'Yes', true, '2026-11-03', '11:22am'],
    ['lower-third_v2.mp4', ['lower-third'], 2, 'Combined', 'Pass', 'Yes', true, '2026-11-02', '3:35pm'],
    ['lower-third_v1.mp4', ['lower-third'], 1, 'Single', 'Fail', 'Yes', false, '2026-11-02', '10:05am'],
    ['crossfade_v0.mp4', ['crossfade'], 0, 'Single', 'Fail', 'No', false, '2026-11-01', '2:50pm'],
    ['lower-third-combo_v1.mp4', ['lower-third'], 1, 'Combined', 'Pass', 'No', false, '2026-10-31', '12:30pm'],
    ['outro-sequence_v1.mp4', ['lower-third', 'crossfade'], 1, 'Storyboard', 'Pass', 'Yes', false, '2026-10-30', '5:44pm'],
    ['lower-third_v0.mp4', ['lower-third'], 0, 'Single', 'Fail', 'No', false, '2026-10-29', '9:58am'],
    ['find-footage_v1.mp4', ['find-footage'], 1, 'Single', 'Pass', 'Yes', false, '2026-10-28', '3:16pm'],
    ['kinetic-type_v0.mp4', ['kinetic-type'], 0, 'Storyboard', 'Fail', 'Yes', false, '2026-10-27', '1:40pm'],
    ['caption-sync_v0.mp4', ['caption-sync'], 0, 'Single', 'Fail', 'No', false, '2026-10-26', '11:11am']
  ];

  // [file, skills, version, level, daysLeft, date]
  const deletedRows = [
    ['lower-third_alt.mp4', ['lower-third'], 3, 'Single', 29, '2026-11-08'],
    ['lt-crossfade_v0.mp4', ['lower-third', 'crossfade'], 0, 'Combined', 28, '2026-11-06'],
    ['crossfade_alt.mp4', ['crossfade'], 1, 'Single', 26, '2026-11-05'],
    ['lower-third_test.mp4', ['lower-third'], 2, 'Single', 21, '2026-11-01'],
    ['crossfade_test.mp4', ['crossfade'], 0, 'Single', 14, '2026-10-25'],
    ['lower-third_old.mp4', ['lower-third'], 1, 'Combined', 9, '2026-10-20'],
    ['intro-sequence_v0.mp4', ['lower-third', 'crossfade'], 0, 'Storyboard', 3, '2026-10-14'],
    ['lower-third_tmp.mp4', ['lower-third'], 0, 'Single', 1, '2026-10-12']
  ];

  function makeRun(i, file, runSkills, version, level, extra) {
    const main = runSkills[0];
    const fb = FEEDBACK[main] || ['', ''];
    return Object.assign({
      id: 'r' + i,
      file,
      skills: runSkills.slice(),
      version,
      level,
      runsAtLevel: 'xx',
      complete: 'Pass',
      fidelity: 'xx%',
      editable: 'Yes',
      quality: 'x.x / 5',
      best: false,
      tokens: 'xxK',
      cost: '$x.xx',
      duration: '0:06',
      date: '2026-11-01',
      time: '12:00pm',
      prompt: PROMPTS[main] || '',
      liked: fb[0],
      change: fb[1],
      deleted: false,
      daysLeft: null
    }, extra);
  }

  const runs = rows.map((r, i) =>
    makeRun(i + 1, r[0], r[1], r[2], r[3], { complete: r[4], editable: r[5], best: r[6], date: r[7], time: r[8] })
  );
  deletedRows.forEach((r, i) => {
    runs.push(makeRun(100 + i, r[0], r[1], r[2], r[3], { deleted: true, daysLeft: r[4], date: r[5], time: '10:00am' }));
  });

  window.ASPECT_DATA = {
    skills,
    runs,
    levels: ['Single', 'Combined', 'Storyboard'],
    defaultPrompt: LOWER_THIRD_PROMPT,
    // Sample content for the Feedback step (Figma 05 / 05b). The suggested
    // prompt is a fixed example; there is no backend generating it.
    feedbackExample: {
      liked: 'The slide-in easing feels natural and the type hierarchy is clear. Bar color matches the brand.',
      change: 'It cuts out instead of fading. The title text is a bit small, and the bar should extend past the name.'
    },
    improvedPrompt:
      'Create a 6-second lower-third for a speaker named Maya Chen, Head of Design. Slide in from the left with an ease-out on a brand-blue bar that extends 24px past the longest line. Hold for 4 seconds, then fade out over 0.5 seconds (no hard cut). Use Instrument Sans, white text, title at 70% of the name size.',
    promptChanges: ['+ 0.5s fade-out', '+ Ease-out on entry', '+ Bar extends past text', '+ Title size ratio']
  };
})();
