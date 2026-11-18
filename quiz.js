// Quiz scenes: one decision each, seen through one player's eyes.
// play = a preset id, you = the player you are, freeze = [beat index, fraction of that beat],
// defense = where a defender goes to set up the read (they ease there over that beat),
// answerMoves = extra movement for you on the freeze beat, so the right answer can play out.
export const QUIZ = [
  {
    id: 'drive-kick-corner', title: 'Drive and kick',
    play: 'preset-drive-kick',
    you: 'o5',
    freeze: [1, 0.72],
    // X5 leaves you to help on the drive.
    defense: { d5: { beat: 1, from: 0.25, to: [318, 150] } },
    prompt: '1 drives right at your side of the lane, and your defender slides over to help stop the ball. You’re in the right corner. What do you do?',
    choices: [
      { label: 'Stay in the corner, hands ready', correct: true, why: 'Your defender left you to help, so the corner three is the most open shot on the floor, and it’s a short pass for 1.' },
      { label: 'Cut to the rim', why: 'Cutting drags your defender back with you and crowds the lane 1 is driving into.' },
      { label: 'Run toward 1 for a handoff', why: 'Moving toward the ball brings your defender with you, and two players in one spot is easy to guard.' },
      { label: 'Get back on defense', why: 'Too early. Your team still has the ball and you’re the open player.' },
    ],
    rule: 'Your defender helps on a drive → be ready right where they left you.',
  },
  {
    id: 'backdoor-wing', title: 'Beat the overplay',
    play: 'preset-backdoor',
    you: 'o2',
    freeze: [1, 0.95],
    // X2 overplays you, standing in the passing lane.
    defense: { d2: { beat: 0, from: 0, to: [118, 262] } },
    prompt: 'You’re on the left wing and your defender is overplaying you, standing in the passing lane. 5 just caught it at the free-throw line. What do you do?',
    choices: [
      { label: 'Cut backdoor to the rim', correct: true, why: 'Your defender is on the wrong side of you, so the space behind them is wide open. 5 is facing the basket and can bounce it to you.' },
      { label: 'Step further out to get open', why: 'That’s what the overplay wants: you end up far from the basket and out of the play.' },
      { label: 'Stand still and call for it', why: 'Your defender is already in the passing lane. Standing still makes the steal easy.' },
      { label: 'Go set a screen for 1', why: 'You give up the best scoring chance on the floor: the open lane behind your defender.' },
    ],
    rule: 'Defender overplays you → go behind them.',
  },
  {
    id: 'pnr-roll', title: 'Roll or pop?',
    play: 'preset-pnr',
    you: 'o5',
    freeze: [2, 0.15],
    // X5 steps up to stop the ball as 1 comes off the screen.
    defense: { d5: { beat: 1, from: 0.5, to: [300, 296] } },
    prompt: 'You just set a ball screen at the top and 1 is coming off it to the right. Your defender steps up to stop the ball. What do you do?',
    choices: [
      { label: 'Roll hard to the rim', correct: true, why: 'Your defender is out on the ball, so nobody is between you and the basket. Roll and give 1 a target.' },
      { label: 'Pop out for a three', why: 'Popping works when your defender sags back. Here they stepped up, so the rim is the open spot.' },
      { label: 'Stay and screen again', why: 'The screen already worked. Staying just clogs the space 1 is driving into.' },
      { label: 'Back up to the half-court line', why: 'That takes you out of the play and leaves 1 against two defenders.' },
    ],
    rule: 'Screener’s defender steps up to the ball → roll to the rim.',
  },
  {
    id: 'post-crash', title: 'Shot goes up',
    play: 'preset-post-up',
    you: 'o2',
    freeze: [4, 0.3],
    prompt: '5 goes up for a hook shot on the right block. You’re on the left wing, the side away from the ball. What do you do as the shot goes up?',
    choices: [
      { label: 'Crash the boards on the weak side', correct: true, why: 'Most missed shots bounce long to the side opposite the shot. Your defender is watching the ball, so you can get inside them.' },
      { label: 'Box out your man', why: 'Boxing out is good, but misses go long to the weak side. Go get it.' },
      { label: 'Sprint back on defense', why: 'Someone should get back, but usually that’s the guards up top. From the wing you’re in the best spot to rebound.' },
      { label: 'Cut to the left corner', why: 'Moving away from the rim takes you out of rebounding position.' },
    ],
    rule: 'Shot goes up from the other side → crash the weak side.',
    answerMoves: { to: [205, 85], wp: [[150, 170]] },
  },
  {
    id: 'give-go', title: 'After you pass', play: 'preset-give-go', you: 'o1', freeze: [0, 0.85],
    defense: { d1: { beat: 0, from: 0.4, to: [205, 300] } },
    prompt: 'You just passed to 2 on the left wing. Your defender turns their head to watch the ball. What do you do?',
    choices: [
      { label: 'Cut hard to the rim', correct: true, why: 'Your defender is ball-watching, so you can beat them to the basket before they turn back. That’s the give and go.' },
      { label: 'Spot up at the top for it back', why: 'He just turned his head. Standing still wastes the one moment you can beat him.' },
      { label: 'Run over for a handoff', why: 'Running toward 2 drags your defender right back into the play.' },
      { label: 'Go set a screen away from the ball', why: 'Not bad in a motion offense, but you’d miss the open lane your defender just gave you.' },
    ],
    rule: 'Pass, then cut while your defender watches the ball.',
  },
  {
    id: 'pick-pop', title: 'Screener, read the drop', play: 'preset-pick-pop', you: 'o4', freeze: [2, 0.12],
    defense: { d4: { beat: 1, from: 0.6, to: [262, 225] } },
    prompt: 'You set a ball screen and 1 goes left off it. Your defender drops back into the paint to protect the rim. What do you do?',
    choices: [
      { label: 'Pop out to the open space', correct: true, why: 'Your defender is sitting in the paint, so the space behind the screen is wide open for a jumper.' },
      { label: 'Roll to the rim', why: 'Your defender is already back there waiting for you. Rolling runs straight into them.' },
      { label: 'Short roll to the middle', why: 'He dropped into the paint, so a short roll walks right into him.' },
      { label: 'Slide to the short corner', why: 'You’d be running toward the paint he’s already sitting in.' },
    ],
    rule: 'Screener’s defender drops → pop.',
  },
  {
    id: 'zipper', title: 'Get open up top', play: 'preset-zipper', you: 'o2', freeze: [1, 0.02],
    prompt: '1 just dribbled to the left wing. You’re on the left block, 4 is standing just above you on the lane line, and your defender is on your hip. What do you do?',
    choices: [
      { label: 'Zip up the lane line off 4 to the top', correct: true, why: 'Running straight up past 4 rubs your defender off the screen and puts you at the top for an easy catch.' },
      { label: 'Post up on the block', why: 'The bottom of the zone is sitting right on you. The hole is at the line.' },
      { label: 'Cut across to the other block', why: 'That takes you away from the ball and wastes 4’s screen.' },
      { label: 'Flare to the corner', why: 'Your man is between you and the corner. The screen sends you up top.' },
    ],
    rule: 'Screen is set for you → go shoulder to shoulder past it.',
  },
  {
    id: 'iverson', title: 'Across the top', play: 'preset-iverson', you: 'o2', freeze: [1, 0.02],
    prompt: '4 and 5 are standing at the elbows. 1 has it up top and you’re on the right wing. What do you do?',
    choices: [
      { label: 'Run over the top of both elbows to the left wing', correct: true, why: 'Each big is a screen. Running tight past both loses your defender and you catch it moving.' },
      { label: 'Cut to the rim', why: 'Both bigs are in the lane area, so the basket is crowded.' },
      { label: 'Curl into the lane', why: 'Curling takes you into the bigs and their defenders. Over the top is clean.' },
      { label: 'Go set a screen for 1', why: 'This set is built for you to run off the bigs, not to screen.' },
    ],
    rule: 'Two screens in a row → come off both, tight.',
  },
  {
    id: 'hammer', title: 'Baseline drive, weak side', play: 'preset-hammer', you: 'o3', freeze: [2, 0.05],
    prompt: '1 is driving the right baseline. You’re low on the left side, and 4 comes over to screen your defender. What do you do?',
    choices: [
      { label: 'Fade to the left corner', correct: true, why: '4 is screening your defender as they try to help. Fading to the corner gives 1 a skip pass to a wide-open three.' },
      { label: 'Cut to the rim', why: 'You’d run into the help defense and the screen would block your own path.' },
      { label: 'Come up to the wing', why: 'Moving up makes the pass longer and lets your defender recover.' },
      { label: 'Stay ready to shoot', why: '4’s screen is meant to free you in the corner. Standing still lets your man fight over it.' },
    ],
    rule: 'Baseline drive from the other side → drift to the corner.',
  },
  {
    id: 'dho', title: 'Handoff read', play: 'preset-dho', you: 'o2', freeze: [1, 0.9],
    defense: { d2: { beat: 1, from: 0.4, to: [72, 215] } },
    prompt: '1 is dribbling right at you on the left wing for a handoff. Your defender is trailing behind you, toward the baseline. What do you do?',
    choices: [
      { label: 'Run around 1, take the handoff and attack the middle', correct: true, why: 'Your defender is behind you, so coming off 1 puts them a step late. Take it downhill.' },
      { label: 'Cut backdoor', why: 'Backdoor works when your defender is ahead of you, between you and the ball. Here they’re behind you.' },
      { label: 'Catch and shoot the three', why: 'He’s right on your hip and can still contest it. Going downhill beats him.' },
      { label: 'Screen for 1 instead', why: 'You’re the one getting the ball in this action.' },
    ],
    rule: 'Defender trails you → come off the handoff and attack.',
  },
  {
    id: 'zone-flash', title: 'Against the 2-3 zone', play: 'preset-zone-gap', you: 'o5', freeze: [1, 0.02],
    prompt: 'The defense is in a 2-3 zone, and nobody is standing at the free-throw line. You’re on the right short block. What do you do?',
    choices: [
      { label: 'Flash to the free-throw line', correct: true, why: 'That’s the soft middle of a 2-3 zone. Catching there makes two defenders choose, which opens the corners.' },
      { label: 'Post up on the block', why: 'The bottom three of the zone are already there to stop that.' },
      { label: 'Slide to the short corner', why: 'The short corner works when the middle is taken. Here the line is wide open.' },
      { label: 'Screen the top defender', why: 'Screens don’t do much against a zone, since nobody is following one player.' },
    ],
    rule: 'Against a 2-3 zone → get the ball to the middle.',
  },
  {
    id: 'box-seal', title: 'Inbound under the rim', play: 'preset-box', you: 'o5', freeze: [2, 0.1],
    defense: { d5: { beat: 1, from: 0.5, to: [336, 96] } },
    prompt: '3 is inbounding from the baseline. 4 just cross-screened for 2, and your defender turned to watch 2 run to the corner. You’re on the right block. What do you do?',
    choices: [
      { label: 'Seal your defender and step to the rim', correct: true, why: 'Your defender turned their back to you. Pin them with your body and show a target; it’s an easy pass from 3.' },
      { label: 'Run to the corner with 2', why: 'Two players in the corner is easy to guard, and you leave the rim empty.' },
      { label: 'Come out to the free-throw line', why: 'That pulls you away from the shortest and best pass.' },
      { label: 'Screen for 4', why: 'The screening is done. Now it’s your turn to get open.' },
    ],
    rule: 'Defender turns their head → seal and show a target.',
  },
  {
    id: 'down-screen-pop', title: 'Read the down screen', play: 'preset-down-screen', you: 'o2', freeze: [2, 0.04],
    // X2 ducks under 4's screen toward the paint.
    defense: { d2: { beat: 1, from: 0.4, to: [178, 112] } },
    prompt: '4 comes down to screen for you on the left block. Your defender ducks under the screen, toward the paint. What do you do?',
    choices: [
      { label: 'Pop out to the wing', correct: true, why: 'Your defender went under the screen, so the space outside it is wide open for a catch and shoot.' },
      { label: 'Curl to the rim', why: 'Curling goes right where your defender is waiting.' },
      { label: 'Flare to the corner', why: 'He went under, so he’s already between you and the corner. The wing is open.' },
      { label: 'Screen for 4', why: 'The screen is for you. Use it.' },
    ],
    rule: 'Defender goes under the screen → pop out.',
  },
  {
    id: 'floppy-side', title: 'Pick a side', play: 'preset-floppy', you: 'o2', freeze: [2, 0.02],
    // X2 cheats toward 4's side, on the left.
    defense: { d2: { beat: 1, from: 0.2, to: [205, 108] } },
    prompt: 'You start under the rim with a screener on each block. Your defender is leaning toward the left side. Which way do you go?',
    choices: [
      { label: 'Come off 5 to the right wing', correct: true, why: 'Your defender is cheating left, so the right side is free and 5 is already set there.' },
      { label: 'Come off 4 to the left wing', why: 'That runs straight into the side your defender is guarding.' },
      { label: 'Curl off 4 into the lane', why: 'You’d be going right where he’s leaning.' },
      { label: 'Pop to the top of the key', why: 'Too far from either screen, and your defender can follow easily.' },
    ],
    rule: 'Defender cheats one side → come off the other screen.',
  },
  {
    id: 'iso-left', title: 'One on one', play: 'preset-iso', you: 'o1', freeze: [1, 0.04],
    // X1 shades your right hand.
    defense: { d1: { beat: 0, from: 0.4, to: [290, 286] } },
    prompt: 'Your teammates cleared out so you can go one on one from the top. Your defender is shading your right hand. What do you do?',
    choices: [
      { label: 'Attack left to the rim', correct: true, why: 'Your defender is sitting on your right, so the left side is the open lane.' },
      { label: 'Drive right into him', why: 'That’s the side he’s already guarding.' },
      { label: 'Pull up from deep', why: 'You have a clear lane to the rim; a long jumper wastes the clear-out.' },
      { label: 'Jab, then pull up', why: 'A pull-up in his face is a tough shot when his feet already give you a lane.' },
    ],
    rule: 'Defender shades one hand → attack the other way.',
  },
  {
    id: 'ucla-cut', title: 'Pass, then cut', play: 'preset-ucla', you: 'o1', freeze: [1, 0.04],
    prompt: 'You just passed to 2 on the right wing. 5 is standing at the high post, right next to your defender. What do you do?',
    choices: [
      { label: 'Cut off 5 straight to the rim', correct: true, why: '5 is a screen. Cutting tight past him leaves your defender behind, and 2 can throw it to you at the rim.' },
      { label: 'Spot up for it back', why: 'Standing still wastes the screen and gives 2 nobody to pass to.' },
      { label: 'Cut away from 5', why: 'Going the other way means nobody gets in your defender’s way.' },
      { label: 'Ask for it back', why: 'Running toward 2 brings your defender with you.' },
    ],
    rule: 'Pass to the wing → cut off the high post screen.',
  },
  {
    id: 'elevator-gap', title: 'Elevator doors', play: 'preset-elevator', you: 'o2', freeze: [1, 0.12],
    prompt: 'You’re under the rim. 4 and 5 are at the elbows with a gap between them, and your defender is chasing you. Where do you run?',
    choices: [
      { label: 'Sprint up through the gap', correct: true, why: '4 and 5 close the gap right behind you, and your defender runs into the doors.' },
      { label: 'Run around the outside', why: 'Going around gives your defender a clean path to follow you.' },
      { label: 'Post up under the rim', why: 'The play is built to get you a shot up top.' },
      { label: 'Pop to the corner', why: 'The corner is far from the screens. Your man just follows you there.' },
    ],
    rule: 'Two screeners with a gap → sprint through before it closes.',
  },
  {
    id: 'spain-pop', title: 'After the back screen', play: 'preset-spain', you: 'o2', freeze: [3, 0.05],
    // X2 leaves you to help on 5's roll.
    defense: { d2: { beat: 2, from: 0.55, to: [258, 160] } },
    prompt: '1 is driving off 5’s screen and you just back-screened 5’s defender. Your own defender leaves you to help on 5. What do you do?',
    choices: [
      { label: 'Pop out to the top for three', correct: true, why: 'Your defender left to help on the roll, so you’re wide open at the top.' },
      { label: 'Roll to the rim with 5', why: 'Two players rolling crowds the paint and your defender is already there.' },
      { label: 'Slip to the short corner', why: 'The paint is crowded with 5 and your man. The top is the open spot.' },
      { label: 'Go to the corner', why: '2 is already spaced there; the top is the open spot.' },
    ],
    rule: 'Your defender helps after your screen → pop.',
  },
  {
    id: 'slip', title: 'Screener, read your defender', play: 'preset-slip', you: 'o5', freeze: [1, 0.9],
    // X5 cheats up level with you, waiting to hedge on 1.
    defense: { d5: { beat: 0, from: 0.5, to: [318, 298] } },
    prompt: 'You run up to set a ball screen for 1. Your defender steps up level with you, ready to jump out at 1 the moment they come off it. What do you do?',
    choices: [
      { label: 'Set the screen anyway', why: 'That’s exactly what your defender is waiting for. 1 comes off the screen straight into the hedge.' },
      { label: 'Slip to the rim', correct: true, why: 'Your defender is up level with you, leaning toward 1. Nobody is behind you, so slip before contact and it’s a layup.' },
      { label: 'Pop out to the wing', why: 'You’d be open, but your defender is right there to recover. The rim behind them is wide open.' },
      { label: 'Re-screen on the other side', why: 'Your man is already up level. Screening again just gives him time.' },
    ],
    rule: 'Your defender cheats up to hedge → slip to the rim.',
  },
  // ---------- Batch 2: harder reads, matchups and defense ----------
  {
    id: 'short-roll', title: 'They trapped the ball', play: 'preset-short-roll', you: 'o5', freeze: [2, 0.35],
    // Both defenders jump 1; X4 sinks to protect the rim.
    defense: { d5: { beat: 1, from: 0.6, to: [336, 318] }, d1: { beat: 2, from: 0, to: [298, 338] }, d4: { beat: 1, from: 0.5, to: [210, 135] } },
    prompt: 'You screened for 1 and both defenders jumped the ball. X4 has dropped into the paint. What do you do?',
    choices: [
      { label: 'Short roll to the free-throw line', correct: true, why: 'Two defenders are on 1, so it’s 4 on 3 behind them. Catch in the middle and make the next play.' },
      { label: 'Roll all the way to the rim', why: 'X4 is already waiting there, and 1 can’t throw over the trap that far.' },
      { label: 'Pop out for three', why: 'That pass has to go over the trap and across the floor. Easy steal.' },
      { label: 'Come back to help 1', why: 'Coming back toward the trap pulls a third defender into it. Help him by getting behind it.' },
    ],
    rule: 'Two on the ball → short roll to the middle.',
  },
  {
    id: 'reject', title: 'He jumped the screen', play: 'preset-reject', you: 'o1', freeze: [1, 0.92],
    // X1 jumps to the screen side and X5 sits behind the screen.
    defense: { d1: { beat: 1, from: 0.3, to: [286, 332] }, d5: { beat: 1, from: 0.4, to: [306, 262] } },
    prompt: '5 is coming to screen on your right. Your defender has jumped to that side to take the screen away. What do you do?',
    choices: [
      { label: 'Use the screen anyway', why: 'Your defender is already on that side, and X5 is waiting behind the screen.' },
      { label: 'Reject it and drive left', correct: true, why: 'Your defender gave up the left side to take away the screen. Go where they aren’t.' },
      { label: 'Split the two defenders', why: 'X5 is sitting right behind the screen. Splitting walks you into both of them.' },
      { label: 'Back it out and reset', why: 'You’d waste the advantage. The left side is wide open right now.' },
    ],
    rule: 'Your defender jumps the screen → reject it.',
  },
  {
    id: 'post-double', title: 'Doubled in the post', play: 'preset-post-double', you: 'o5', freeze: [1, 0.85],
    // X2 leaves 2 to double you.
    defense: { d2: { beat: 1, from: 0, to: [362, 118] } },
    prompt: 'You have it on the right block. 2’s defender just left 2 to double-team you. What do you do?',
    choices: [
      { label: 'Score through both of them', why: 'Two defenders on you is a tough shot, and you have an open teammate.' },
      { label: 'Kick it out to 2', correct: true, why: 'The double came from 2’s defender, so 2 is the one left open. It’s also the shortest pass.' },
      { label: 'Skip it to 4 across the floor', why: 'A long pass out of a double gets picked off, and X4 is still home.' },
      { label: 'Pass to 1 up top', why: 'X1 is still home on 1. The man who left is 2’s, so 2 is the open one.' },
    ],
    rule: 'Doubled in the post → pass to where the double came from.',
  },
  {
    id: 'closeout', title: 'He’s flying at you', play: 'preset-closeout', you: 'o3', freeze: [2, 0.75],
    // X3 sprints out from helping, then flies past on the shot fake.
    defense: { d3: { beat: 2, from: 0, to: [418, 204], then: { to: [462, 262], at: 0.1, dur: 0.5 } } },
    prompt: '1 kicked it to you on the wing. Your defender is sprinting at you from the paint with his hands up. What do you do?',
    choices: [
      { label: 'Shoot it right away', why: 'He’s flying at your shot. That’s the one thing he can stop.' },
      { label: 'Shot fake, then drive baseline', correct: true, why: 'He’s running too fast to stop. Fake it, let him fly by, and you have a clear lane.' },
      { label: 'Pass it back to 1', why: 'You’d throw away the advantage 1 just made for you.' },
      { label: 'One-dribble pull-up', why: 'He’s flying at you, so he can still recover and bother a pull-up. Go all the way by him.' },
    ],
    rule: 'Defender flying at you → shot fake and drive.',
  },
  {
    id: 'zone-skip', title: 'The zone slid over', play: 'preset-zone-skip', you: 'o2', freeze: [2, 0.7],
    prompt: 'You have it on the right wing against a 2-3 zone, and the whole zone has slid over to you. What do you do?',
    choices: [
      { label: 'Pass to 3 in the near corner', why: 'The zone slid that way too. The bottom defender is already there.' },
      { label: 'Drive the gap', why: 'The zone collapsed toward you. Two defenders are waiting in the gap.' },
      { label: 'Skip it to 4 in the far corner', correct: true, why: 'Everyone slid toward you, so the far corner is empty. One pass over the top beats the whole zone.' },
      { label: 'Swing it back to 1', why: 'Not bad, but it’s slow. The zone just slides back.' },
    ],
    rule: 'Zone slides to the ball → skip it to the far corner.',
  },
  {
    id: 'switch-seal', title: 'The little guy switched onto you', play: 'preset-switch-seal', you: 'o5', freeze: [2, 0.9],
    // They switch: X5 picks up 1, tiny X1 ends up on you, and you seal him all the way to the block.
    defense: { d5: { beat: 2, from: 0.1, to: [352, 282] }, d1: { beat: 2, from: 0.1, to: [302, 262], then: { to: [320, 128], at: 0, dur: 1.4 } } },
    prompt: 'You screened for 1 and they switched. Now their smallest guard is guarding you. What do you do?',
    choices: [
      { label: 'Pop out for three', why: 'A little guard can still contest a jumper. He can’t do anything about you in the post.' },
      { label: 'Roll to the rim', why: 'Rolling lets the little guy run with you and stay in front. Seal him right where he is so he’s stuck behind you.' },
      { label: 'Seal him and post up', correct: true, why: 'You’re way bigger. Pin him on your back, walk him to the block, and score over him.' },
      { label: 'Ask for it up top', why: 'Catching 20 feet out lets him pressure you. Your size wins next to the rim.' },
    ],
    rule: 'Little guy switches onto you → seal him and post up.',
  },
  {
    id: 'floater-drop', title: 'Their big is waiting', play: 'preset-floater-drop', you: 'o1', freeze: [2, 0.75],
    // Their giant center drops back to the rim.
    defense: { d5: { beat: 1, from: 0.5, to: [262, 96] } },
    prompt: 'You came off the screen into the lane. Their huge center dropped back and is waiting at the rim. What do you do?',
    choices: [
      { label: 'Float it over him right now', correct: true, why: 'He’s staying at the rim, so shoot before you get there. A soft floater goes over his reach.' },
      { label: 'Attack the rim', why: 'That’s exactly where he wants you. Layups into a giant get blocked.' },
      { label: 'Kick it out to 4', why: 'X4 is still home on 4. The drop already gave you the shot.' },
      { label: 'Lob it to 5', why: 'Their big dropped right between you and 5. He’s waiting for that pass.' },
    ],
    rule: 'Big waiting at the rim → floater before you get there.',
  },
  {
    id: 'low-man', title: 'Defense: the baseline drive', play: 'preset-low-man', you: 'd5', freeze: [1, 0.55],
    // You rotate from the weak-side block to the front of the rim.
    defense: { d5: { then: { to: [330, 68], at: 0, dur: 0.7 } } },
    prompt: 'You’re guarding 5 on the far block. 2 just beat their defender baseline and is heading for a layup. What do you do?',
    choices: [
      { label: 'Stay with 5', why: 'Then nobody stops 2. That’s a free layup.' },
      { label: 'Rotate over and meet him at the rim', correct: true, why: 'You’re the last line. Get in front of the rim before he gets there, and he has to stop.' },
      { label: 'Chase 2 from behind', why: 'You’ll never catch up from behind. Get in front.' },
      { label: 'Stunt at him, then get back to 5', why: 'A fake doesn’t stop a layup. You have to be set in front of the rim.' },
    ],
    rule: 'Baseline drive, you’re the low man → meet him at the rim.',
  },
  {
    id: 'help-side', title: 'Defense: two passes away', play: 'preset-help-side', you: 'd4', freeze: [1, 0.85],
    // You sink from the corner into the lane.
    defense: { d4: { then: { to: [188, 125], at: 0, dur: 0.9 } } },
    prompt: 'You’re guarding 4 in the left corner. The ball just swung to the right wing, two passes away from 4. Where do you go?',
    choices: [
      { label: 'Stay right next to 4', why: 'Nobody’s passing to 4 from over there. You’re wasting a defender.' },
      { label: 'Run at the ball', why: 'Leaving 4 completely gives up an easy pass and a three.' },
      { label: 'Front the post', why: 'That’s 5’s defender’s job. Now 4 is open and the lane is empty.' },
      { label: 'Sink into the lane', correct: true, why: 'Two passes away, you’re a helper. Sit in the lane where you can stop a drive and still get back to 4.' },
    ],
    rule: 'Two passes away → sink into the lane and help.',
  },
];
