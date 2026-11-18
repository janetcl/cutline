// Preloaded plays. Court units: u across (0–500), v out from the baseline (0–470).
// Shorthand per beat: m = moves (player number → points, the last one is where they
// end up), s = screeners, pc = pace, b = ball ['pass', to, t0, t1] or ['shot', t0, t1],
// dr = dribble in place. looks = per-player size for matchup plays.
import { newPlay, uid, validate } from './model.js?v=20261118f';

function def({ id, name, cat, blurb, start, ball = 1, beats, size = 5, defense = 'man', zone, level, looks }) {
  const p = newPlay({ name, size, defense });
  // looks: per-player size for matchup plays, e.g. { o5: { height: 1.16 }, d1: { height: 0.86 } }
  for (const [pid, l] of Object.entries(looks || {})) { const pl = p.players.find((x) => x.id === pid); if (pl) pl.look = { ...pl.look, ...l }; }
  if (zone) p.zone = zone;
  p.id = 'preset-' + id;
  p.cat = cat;
  p.blurb = blurb;
  p.level = level || (cat === 'Easy' ? 'Beginner' : 'Intermediate');
  p.ball = 'o' + ball;
  for (const [n, q] of Object.entries(start)) p.start['o' + n] = q;
  p.beats = beats.map(([bname, dur, text, o = {}]) => {
    const moves = {};
    for (const [n, pts] of Object.entries(o.m || {})) moves['o' + n] = { to: pts[pts.length - 1], wp: pts.slice(0, -1) };
    for (const n of o.s || []) moves['o' + n] = { ...(moves['o' + n] || {}), act: 'screen' };
    for (const [n, pace] of Object.entries(o.pc || {})) moves['o' + n] = { ...(moves['o' + n] || {}), pace };
    let b = null;
    if (o.b && o.b[0] === 'pass') b = { kind: 'pass', to: 'o' + o.b[1], t0: o.b[2] ?? 0.3, t1: o.b[3] ?? 0.65 };
    if (o.b && o.b[0] === 'shot') b = { kind: 'shot', t0: o.b[1] ?? 0.2, t1: o.b[2] ?? 0.65 };
    return { id: uid(), name: bname, dur, text, moves, ball: b, dribble: !!o.dr };
  });
  return validate(p);
}

const FIVE_OUT = { 1: [250, 320], 2: [80, 230], 3: [420, 230], 4: [18, 36], 5: [482, 36] };

export const PRESETS = [
  // ---------- Easy: one idea each, a few beats ----------
  def({
    id: 'drive-kick', name: 'Drive and kick', cat: 'Easy',
    blurb: 'Five out. 1 drives the gap and kicks it to the open corner for three.',
    start: FIVE_OUT,
    beats: [
      ['Spread out', 1.0, 'Everyone spaced around the arc: top, both wings, both corners.', { dr: true }],
      ['Drive', 1.6, '1 attacks the right side of the lane.', { m: { 1: [[275, 250], [300, 150]] }, pc: { 1: 'early' } }],
      ['Kick out', 1.0, '1 kicks it out to 5 in the right corner.', { b: ['pass', 5, 0.1, 0.6] }],
      ['Corner three', 1.3, '5 catches and shoots.', { b: ['shot', 0.15, 0.7] }],
    ],
  }),
  def({
    id: 'pick-pop', name: 'Pick and pop', cat: 'Easy',
    blurb: '4 screens for 1, then pops out for an open jumper instead of rolling.',
    start: { 1: [250, 330], 2: [18, 36], 3: [482, 36], 4: [320, 195], 5: [170, 80] },
    beats: [
      ['Set', 1.0, '1 up top, 4 at the right elbow, 5 on the left block.', { dr: true }],
      ['Screen', 1.3, '4 comes up and screens for 1.', { m: { 4: [[285, 300]] }, s: [4], dr: true }],
      ['Drive and pop', 1.7, '1 goes left off the screen. 4 pops out to the right side.', { m: { 1: [[205, 295], [150, 245]], 4: [[330, 305], [385, 290]] } }],
      ['Pass', 1.0, '1 throws it back to 4.', { b: ['pass', 4, 0.1, 0.6] }],
      ['Jumper', 1.3, '4 shoots the open jumper.', { b: ['shot', 0.15, 0.7] }],
    ],
  }),
  def({
    id: 'pass-cut', name: 'Pass and cut', cat: 'Easy',
    blurb: 'The basic motion rule: pass, cut to the rim, everyone slides over a spot.',
    start: FIVE_OUT,
    beats: [
      ['Pass', 1.0, '1 passes to 2 on the left wing.', { b: ['pass', 2, 0.15, 0.6] }],
      ['Cut', 1.5, '1 cuts straight to the rim looking for the ball.', { m: { 1: [[245, 190], [250, 80]] }, pc: { 1: 'explode' } }],
      ['Fill', 1.7, '1 clears to the right corner. 5 lifts to the wing, 3 slides to the top.', { m: { 1: [[360, 55], [482, 36]], 5: [[440, 130], [420, 230]], 3: [[340, 290], [250, 320]] } }],
      ['Swing', 1.0, '2 swings it to 3 at the top.', { b: ['pass', 3, 0.1, 0.6] }],
      ['Swing again', 1.0, '3 swings it to 5 on the right wing.', { b: ['pass', 5, 0.1, 0.6] }],
      ['Shot', 1.3, '5 shoots from the wing.', { b: ['shot', 0.15, 0.7] }],
    ],
  }),
  def({
    id: 'dho', name: 'Dribble handoff', cat: 'Easy',
    blurb: '1 dribbles at 2 and hands it off. 2 comes around and attacks the rim.',
    start: FIVE_OUT,
    beats: [
      ['Set', 1.0, 'Five out. 1 has it up top.', { dr: true }],
      ['Dribble at', 1.4, '1 dribbles toward 2 on the left wing.', { m: { 1: [[190, 290], [125, 250]] } }],
      ['Handoff', 1.1, '2 runs past 1 and takes the handoff. 1 stays to screen.', { m: { 2: [[95, 260], [150, 285]] }, s: [1], b: ['pass', 2, 0.35, 0.6] }],
      ['Drive', 1.5, '2 attacks the rim.', { m: { 2: [[215, 220], [238, 105]] }, pc: { 2: 'early' } }],
      ['Layup', 1.2, '2 lays it in.', { b: ['shot', 0.1, 0.6] }],
    ],
  }),
  def({
    id: 'down-screen', name: 'Down screen for a shooter', cat: 'Easy',
    blurb: '4 screens down, 2 pops out to the wing for an open catch-and-shoot.',
    start: { 1: [250, 320], 2: [170, 70], 3: [420, 230], 4: [130, 205], 5: [330, 80] },
    beats: [
      ['Set', 1.0, '2 on the left block, 4 above them on the wing.', { dr: true }],
      ['Down screen', 1.3, '4 comes down and screens for 2.', { m: { 4: [[160, 120]] }, s: [4], dr: true }],
      ['Pop out', 1.5, '2 pops out to the left wing off the screen.', { m: { 2: [[125, 120], [95, 220]] }, pc: { 2: 'explode' }, dr: true }],
      ['Pass', 1.0, '1 hits 2 on the wing.', { b: ['pass', 2, 0.1, 0.6] }],
      ['Shot', 1.3, '2 catches and shoots.', { b: ['shot', 0.15, 0.7] }],
    ],
  }),
  def({
    id: 'post-up', name: 'Post up', cat: 'Easy',
    blurb: 'Get it to the wing, feed the big on the block, back down for a hook.',
    start: { 1: [250, 320], 2: [80, 230], 3: [420, 230], 4: [18, 36], 5: [330, 85] },
    beats: [
      ['Pass to wing', 1.0, '1 passes to 3 on the right wing.', { b: ['pass', 3, 0.15, 0.6] }],
      ['Seal', 1.0, '5 seals their defender on the right block.', { m: { 5: [[322, 98]] } }],
      ['Post entry', 1.0, '3 feeds 5 in the post.', { b: ['pass', 5, 0.1, 0.55] }],
      ['Back down', 1.6, '5 dribbles back toward the rim.', { m: { 5: [[300, 80], [284, 66]] } }],
      ['Hook shot', 1.3, '5 turns and shoots a hook.', { b: ['shot', 0.15, 0.7] }],
    ],
  }),
  def({
    id: 'iso', name: 'Isolation', cat: 'Easy',
    blurb: 'Everyone clears to the corners and wings so 1 can go one on one.',
    start: { 1: [250, 320], 2: [80, 230], 3: [420, 230], 4: [180, 190], 5: [320, 190] },
    beats: [
      ['Clear out', 1.5, 'The bigs clear to the corners and the wings get low. The middle is empty.', { m: { 4: [[110, 120], [18, 36]], 5: [[390, 120], [482, 36]], 2: [[60, 150]], 3: [[440, 150]] }, dr: true }],
      ['Attack', 1.7, '1 drives at their defender and gets to the rim.', { m: { 1: [[225, 235], [255, 110]] }, pc: { 1: 'late' } }],
      ['Finish', 1.2, '1 finishes.', { b: ['shot', 0.1, 0.6] }],
    ],
  }),
  def({
    id: 'two-pnr', name: '2-on-2 pick and roll', cat: 'Easy', size: 2,
    blurb: 'The simplest two-player action: screen, roll, pass, layup.',
    start: { 1: [250, 320], 2: [330, 190] },
    beats: [
      ['Set', 1.0, '1 up top, 2 at the right elbow.', { dr: true }],
      ['Screen', 1.3, '2 sets a ball screen.', { m: { 2: [[285, 300]] }, s: [2], dr: true }],
      ['Roll', 1.7, '1 comes off the screen. 2 rolls to the rim.', { m: { 1: [[330, 290], [372, 255]], 2: [[300, 190], [265, 90]] }, pc: { 2: 'explode' } }],
      ['Pass', 1.0, '1 hits 2.', { b: ['pass', 2, 0.1, 0.55] }],
      ['Layup', 1.2, '2 lays it in.', { b: ['shot', 0.1, 0.6] }],
    ],
  }),
  def({
    id: 'three-screen-away', name: '3-on-3 pass and screen away', cat: 'Easy', size: 3,
    blurb: 'Pass one way, screen the other way. 3 cuts off the screen to the rim.',
    start: { 1: [250, 310], 2: [80, 190], 3: [420, 190] },
    beats: [
      ['Pass', 1.0, '1 passes to 2 on the left.', { b: ['pass', 2, 0.15, 0.6] }],
      ['Screen away', 1.4, '1 goes away from the ball to screen for 3.', { m: { 1: [[330, 260], [385, 215]] }, s: [1] }],
      ['Cut', 1.6, '3 comes off the screen and cuts to the rim.', { m: { 3: [[400, 260], [330, 230], [268, 110]] }, pc: { 3: 'explode' } }],
      ['Pass', 1.0, '2 hits 3 on the cut.', { b: ['pass', 3, 0.05, 0.5] }],
      ['Layup', 1.2, '3 finishes.', { b: ['shot', 0.1, 0.6] }],
    ],
  }),
  def({
    id: 'zone-gap', level: 'Intermediate', name: 'Beat the 2-3 zone', cat: 'Easy', defense: 'zone', zone: '2-3',
    blurb: 'Against a 2-3 zone: flash to the middle, then kick to the open corner.',
    start: { 1: [250, 320], 2: [90, 240], 3: [410, 240], 4: [18, 36], 5: [330, 70] },
    beats: [
      ['Set', 1.0, 'Players sit in the gaps of the zone. 5 on the right short block.', { dr: true }],
      ['Flash', 1.4, '5 flashes to the free-throw line, the soft middle of the 2-3.', { m: { 5: [[300, 130], [255, 190]] }, pc: { 5: 'explode' }, dr: true }],
      ['High post', 1.0, '1 hits 5 at the free-throw line.', { b: ['pass', 5, 0.1, 0.55] }],
      ['Kick to corner', 1.0, 'The zone collapses on 5, so 5 kicks to 4 in the left corner.', { b: ['pass', 4, 0.15, 0.65] }],
      ['Corner three', 1.3, '4 shoots.', { b: ['shot', 0.15, 0.7] }],
    ],
  }),

  // ---------- Sets ----------
  def({
    id: 'yesterday', level: 'Intermediate', name: 'Backdoor, stagger, cross', cat: 'Cuts',
    blurb: 'Backdoor cut, come up off two stacked screens, then the low screener cuts across.',
    start: { 1: [250, 320], 2: [420, 230], 3: [120, 190], 4: [165, 90], 5: [330, 85] },
    beats: [
      ['Set', 1.6, '1 has it up top. 3 and 4 stack on the left to screen. 5 posts on the right block, 2 is on the right wing.', { dr: true }],
      ['Backdoor cut', 1.9, '2 cuts behind their defender to the rim and keeps running the baseline to the left.', { m: { 2: [[372, 150], [292, 68], [200, 42], [118, 50]] }, dr: true }],
      ['Up the stagger', 2.4, "2 runs tight around the outside of 4's low screen, then 3's high screen, and curls to the top. 1 feeds 5 in the post.", { m: { 2: [[140, 106], [104, 204], [124, 266], [180, 305]], 5: [[324, 96]] }, s: [4, 3], pc: { 2: 'explode' }, b: ['pass', 5, 0.4, 0.66], dr: true }],
      ['Kick out', 1.6, '5 passes back out to 2 at the top. 1 clears to the right wing.', { m: { 1: [[330, 306], [405, 255]] }, b: ['pass', 2, 0.08, 0.42] }],
      ['Cross cut', 1.9, '4 leaves the low screen, cuts across the lane and catches from 2.', { m: { 4: [[242, 132], [322, 148]] }, pc: { 4: 'explode' }, b: ['pass', 4, 0.55, 0.86] }],
      ['Shot', 1.7, '4 rises up for the short jumper.', { b: ['shot', 0.15, 0.62] }],
    ],
  }),
  def({
    id: 'pnr', level: 'Beginner', name: 'High pick and roll', cat: 'Pick and roll',
    blurb: '5 screens at the top, 1 attacks, 5 rolls for the pass.',
    start: { 1: [250, 330], 2: [20, 36], 3: [480, 36], 4: [70, 220], 5: [330, 190] },
    beats: [
      ['Set', 1.2, '1 at the top of the key. Shooters in both corners, 4 on the left wing, 5 at the right elbow.', { dr: true }],
      ['Screen', 1.4, '5 comes up and sets a ball screen on 1\'s right side.', { m: { 5: [[300, 250], [282, 300]] }, s: [5], dr: true }],
      ['Drive and roll', 1.8, '1 dribbles off the screen to the right. 5 rolls hard to the rim.', { m: { 1: [[320, 300], [372, 258]], 5: [[305, 190], [268, 92]] }, pc: { 5: 'explode' } }],
      ['Pass', 1.2, '1 hits 5 on the roll.', { b: ['pass', 5, 0.1, 0.5] }],
      ['Finish', 1.4, '5 lays it in.', { m: { 5: [[258, 72]] }, b: ['shot', 0.3, 0.7] }],
    ],
  }),
  def({
    id: 'slip', level: 'Intermediate', name: 'Slip screen', cat: 'Pick and roll',
    blurb: '5 runs up to screen, X5 steps up level to hedge, so 5 slips behind them to the rim.',
    start: { 1: [250, 330], 2: [20, 36], 3: [480, 36], 4: [70, 220], 5: [330, 190] },
    beats: [
      ['Set', 1.2, '1 at the top of the key. Shooters in both corners, 4 on the left wing, 5 at the right elbow.', { dr: true }],
      ['Fake screen', 1.4, '5 runs up to screen on 1\'s right side. X5 steps up level with 5, ready to jump out when 1 comes off the screen.', { m: { 5: [[305, 250], [290, 292]] }, dr: true }],
      ['Slip', 1.4, 'Before contact, 5 slips behind X5 straight to the rim. 1 takes a dribble right as if using the screen.', { m: { 5: [[288, 230], [262, 104]], 1: [[272, 326]] }, pc: { 5: 'explode' }, dr: true }],
      ['Pass', 1.0, '1 hits 5 on the slip.', { b: ['pass', 5, 0.1, 0.55] }],
      ['Finish', 1.3, '5 lays it in.', { m: { 5: [[256, 74]] }, b: ['shot', 0.3, 0.7] }],
    ],
  }),
  def({
    id: 'horns', level: 'Intermediate', name: 'Horns: ball screen', cat: 'Pick and roll',
    blurb: 'Both bigs at the elbows. One screens and rolls, the other pops.',
    start: { 1: [250, 330], 2: [18, 36], 3: [482, 36], 4: [180, 190], 5: [320, 190] },
    beats: [
      ['Set', 1.2, 'Horns: 4 and 5 at the elbows, 2 and 3 in the corners.', { dr: true }],
      ['Screen', 1.4, '5 steps up to screen for 1.', { m: { 5: [[285, 300]] }, s: [5], dr: true }],
      ['Roll and pop', 1.8, '1 comes off the screen. 5 rolls to the rim, 4 pops to the wing.', { m: { 1: [[330, 295], [360, 270]], 5: [[300, 190], [270, 92]], 4: [[150, 250], [170, 300]] }, pc: { 5: 'explode' } }],
      ['Pass', 1.0, '1 hits 5 on the roll.', { b: ['pass', 5, 0.1, 0.55] }],
      ['Finish', 1.4, '5 finishes at the rim. 3 crashes.', { m: { 3: [[430, 120]] }, b: ['shot', 0.25, 0.7] }],
    ],
  }),
  def({
    id: 'give-go', level: 'Beginner', name: 'Give and go', cat: 'Cuts',
    blurb: 'Pass to the wing, cut hard to the rim, get it right back.',
    start: { 1: [250, 320], 2: [90, 230], 3: [420, 230], 4: [60, 40], 5: [440, 40] },
    beats: [
      ['Give', 1.2, '1 passes to 2 on the left wing.', { b: ['pass', 2, 0.2, 0.6] }],
      ['Go', 1.6, '1 fakes away, then cuts to the rim.', { m: { 1: [[285, 210], [252, 86]] }, pc: { 1: 'explode' } }],
      ['Return pass', 1.1, '2 hits 1 on the cut.', { b: ['pass', 1, 0.05, 0.5] }],
      ['Layup', 1.3, '1 lays it in.', { b: ['shot', 0.2, 0.65] }],
    ],
  }),
  def({
    id: 'backdoor', level: 'Beginner', name: 'Backdoor cut', cat: 'Cuts',
    blurb: 'Princeton-style: when the wing is overplayed, go behind for the bounce pass.',
    start: { 1: [250, 320], 2: [80, 230], 3: [420, 230], 4: [440, 40], 5: [330, 80] },
    beats: [
      ['Flash', 1.3, '5 flashes to the high post.', { m: { 5: [[290, 150], [250, 200]] }, dr: true }],
      ['Pass to post', 1.0, '1 passes to 5 at the free-throw line.', { b: ['pass', 5, 0.15, 0.6] }],
      ['Backdoor', 1.6, '2 is overplayed, so they cut behind their defender.', { m: { 2: [[120, 160], [225, 70]] }, pc: { 2: 'explode' } }],
      ['Bounce pass', 1.0, '5 bounces it to 2.', { b: ['pass', 2, 0.05, 0.55] }],
      ['Layup', 1.2, '2 finishes.', { b: ['shot', 0.15, 0.6] }],
    ],
  }),
  def({
    id: 'spain', level: 'Advanced', name: 'Spain pick and roll', cat: 'Pick and roll',
    blurb: "A shooter back-screens the roller's defender, then pops for three.",
    start: { 1: [250, 330], 2: [90, 236], 3: [480, 36], 4: [20, 36], 5: [330, 190] },
    beats: [
      ['Set', 1.0, '1 up top, 5 at the right elbow, 2 on the left wing.', { dr: true }],
      ['Ball screen', 1.4, '5 sets a ball screen for 1.', { m: { 5: [[285, 300]] }, s: [5], dr: true }],
      ['Back screen', 1.7, "1 drives right. 5 rolls while 2 back-screens 5's defender.", { m: { 1: [[330, 296], [372, 258]], 5: [[300, 200], [268, 95]], 2: [[190, 215], [262, 226]] }, s: [2], pc: { 5: 'explode' } }],
      ['Pop', 1.2, '2 pops back out to the top for three.', { m: { 2: [[222, 285], [200, 310]] } }],
      ['Pass', 1.0, '1 swings it to 2.', { b: ['pass', 2, 0.1, 0.6] }],
      ['Three', 1.4, '2 lets it fly.', { b: ['shot', 0.15, 0.7] }],
    ],
  }),
  def({
    id: 'flex', level: 'Intermediate', name: 'Flex', cat: 'Screens off the ball',
    blurb: 'Baseline flex screen, then a down screen for the screener.',
    start: { 1: [90, 240], 2: [400, 240], 3: [482, 36], 4: [180, 240], 5: [330, 74] },
    beats: [
      ['Set', 1.0, '1 has it on the left wing. 5 on the right block, 3 in the right corner.', { dr: true }],
      ['Flex cut', 1.7, "3 cuts along the baseline off 5's flex screen.", { m: { 3: [[330, 110], [190, 80]] }, s: [5], pc: { 3: 'explode' } }],
      ['Down screen', 1.5, '4 comes down and screens for 5.', { m: { 4: [[185, 160], [292, 112]] }, s: [4] }],
      ['Pop to the top', 1.6, '5 pops to the top and 1 swings it over.', { m: { 5: [[310, 200], [262, 300]] }, b: ['pass', 5, 0.6, 0.92] }],
      ['Shot', 1.3, '5 shoots from the top.', { b: ['shot', 0.15, 0.7] }],
    ],
  }),
  def({
    id: 'floppy', level: 'Advanced', name: 'Floppy', cat: 'Screens off the ball',
    blurb: 'Shooter under the rim picks a side and comes off a screen to the wing.',
    start: { 1: [250, 320], 2: [250, 90], 3: [455, 300], 4: [160, 100], 5: [330, 100] },
    beats: [
      ['Stack', 1.0, '2 under the rim between 4 and 5.', { dr: true }],
      ['Screens set', 1.0, '4 and 5 set screens on both blocks.', { s: [4, 5], dr: true }],
      ['Shooter reads', 1.6, '2 picks the right side and comes off 5 to the wing.', { m: { 2: [[360, 100], [418, 206]] }, s: [5], pc: { 2: 'explode' }, dr: true }],
      ['Catch', 1.0, '1 hits 2 on the wing.', { b: ['pass', 2, 0.1, 0.6] }],
      ['Shoot', 1.3, '2 catches and shoots.', { b: ['shot', 0.1, 0.65] }],
    ],
  }),
  def({
    id: 'box', level: 'Intermediate', name: 'Box inbound (baseline)', cat: 'Inbounds', ball: 3,
    blurb: 'Four in a box under the rim. Screen the screener, inbound to the open player.',
    start: { 1: [190, 64], 2: [310, 150], 3: [330, -22], 4: [190, 150], 5: [310, 64] },
    beats: [
      ['Box set', 1.0, '3 inbounds from the baseline. Four in a box.'],
      ['Cross screen', 1.4, '4 cross-screens for 2.', { m: { 4: [[240, 140], [292, 120]] }, s: [4] }],
      ['Cuts', 1.6, '2 flares to the corner, 5 seals to the rim.', { m: { 2: [[400, 120], [440, 50]], 5: [[285, 45], [262, 60]] }, pc: { 5: 'late' } }],
      ['Inbound', 1.0, '3 hits 5 at the rim.', { b: ['pass', 5, 0.1, 0.55] }],
      ['Layup', 1.2, '5 lays it in.', { b: ['shot', 0.15, 0.6] }],
    ],
  }),
  // ---------- More sets ----------
  def({
    id: 'ucla', level: 'Intermediate', name: 'UCLA cut', cat: 'Cuts',
    blurb: 'Pass to the wing, then cut off the high post back screen straight to the rim.',
    start: { 1: [250, 320], 2: [420, 240], 3: [80, 240], 4: [18, 36], 5: [250, 205] },
    beats: [
      ['Pass to wing', 1.0, '1 passes to 2 on the right wing.', { b: ['pass', 2, 0.15, 0.6] }],
      ['UCLA cut', 1.7, "1 cuts off 5's back screen at the high post, straight to the rim.", { m: { 1: [[275, 250], [232, 190], [245, 85]] }, s: [5], pc: { 1: 'explode' } }],
      ['Lob', 1.0, '2 throws it to 1 at the rim.', { b: ['pass', 1, 0.05, 0.6] }],
      ['Layup', 1.2, '1 finishes.', { b: ['shot', 0.1, 0.6] }],
    ],
  }),
  def({
    id: 'iverson', level: 'Intermediate', name: 'Iverson cut', cat: 'Cuts',
    blurb: 'A wing runs across the top off both elbow screens and catches on the other side.',
    start: { 1: [250, 330], 2: [420, 180], 3: [80, 180], 4: [210, 195], 5: [290, 195] },
    beats: [
      ['Set', 1.0, '4 and 5 at the elbows. 2 on the right wing.', { dr: true }],
      ['Iverson cut', 1.8, '2 runs over the top of 5, then 4, to the left wing.', { m: { 2: [[330, 232], [250, 252], [170, 240], [105, 215]] }, s: [5, 4], pc: { 2: 'explode' }, dr: true }],
      ['Pass', 1.0, '1 hits 2 on the left wing.', { b: ['pass', 2, 0.1, 0.6] }],
      ['Jumper', 1.3, '2 rises up.', { b: ['shot', 0.15, 0.7] }],
    ],
  }),
  def({
    id: 'zipper', level: 'Intermediate', name: 'Zipper', cat: 'Screens off the ball',
    blurb: '2 zips straight up the lane line off a screen to catch at the top, then attacks.',
    start: { 1: [250, 320], 2: [180, 70], 3: [440, 60], 4: [175, 140], 5: [330, 80] },
    beats: [
      ['Dribble to wing', 1.4, '1 dribbles to the left wing.', { m: { 1: [[170, 300], [95, 250]] } }],
      ['Zipper', 1.5, "2 zips up the lane line off 4's screen to the top.", { m: { 2: [[185, 160], [215, 270], [250, 318]] }, s: [4], pc: { 2: 'explode' }, dr: true }],
      ['Pass', 1.0, '1 swings it to 2 at the top.', { b: ['pass', 2, 0.1, 0.6] }],
      ['Attack', 1.5, '2 drives right.', { m: { 2: [[300, 250], [285, 120]] }, pc: { 2: 'early' } }],
      ['Layup', 1.2, '2 finishes.', { b: ['shot', 0.1, 0.6] }],
    ],
  }),
  def({
    id: 'chicago', level: 'Advanced', name: 'Chicago', cat: 'Screens off the ball',
    blurb: 'A pin-down flows straight into a dribble handoff, so the shooter comes off two actions in a row.',
    start: { 1: [250, 320], 2: [130, 60], 3: [440, 60], 4: [120, 170], 5: [330, 190] },
    beats: [
      ['Pass to the slot', 1.2, '5 lifts to the left slot and 1 passes to 5.', { m: { 5: [[260, 260], [195, 300]] }, b: ['pass', 5, 0.5, 0.85] }],
      ['Pin-down', 1.5, '4 screens down and 2 comes up off it.', { m: { 4: [[140, 105]], 2: [[100, 140], [130, 250]] }, s: [4], pc: { 2: 'explode' } }],
      ['Handoff', 1.2, '2 comes right into a handoff from 5.', { m: { 2: [[165, 290], [215, 285]] }, s: [5], b: ['pass', 2, 0.35, 0.6] }],
      ['Drive', 1.5, '2 turns the corner and drives.', { m: { 2: [[262, 220], [252, 100]] }, pc: { 2: 'early' } }],
      ['Layup', 1.2, '2 finishes.', { b: ['shot', 0.1, 0.6] }],
    ],
  }),
  def({
    id: 'hammer', level: 'Advanced', name: 'Hammer', cat: 'Screens off the ball',
    blurb: 'Baseline drive, and a back screen on the weak side frees the corner shooter for the skip pass.',
    start: { 1: [420, 240], 2: [250, 320], 3: [90, 120], 4: [180, 60], 5: [330, 160] },
    ball: 1,
    beats: [
      ['Set', 1.0, '1 on the right wing. 3 low on the left side, 4 on the left block.', { dr: true }],
      ['Baseline drive', 1.6, '1 drives the right baseline.', { m: { 1: [[445, 140], [380, 62]] } }],
      ['Hammer screen', 1.4, "4 screens 3's defender and 3 fades to the corner.", { m: { 4: [[112, 92]], 3: [[70, 80], [18, 36]] }, s: [4], pc: { 3: 'explode' } }],
      ['Skip pass', 1.0, '1 skips it all the way across to 3.', { b: ['pass', 3, 0.05, 0.6] }],
      ['Corner three', 1.3, '3 shoots.', { b: ['shot', 0.15, 0.7] }],
    ],
  }),
  def({
    id: 'elevator', level: 'Advanced', name: 'Elevator doors', cat: 'Screens off the ball',
    blurb: 'The shooter runs up between two screeners, who close the gap behind them like elevator doors.',
    start: { 1: [400, 250], 2: [250, 60], 3: [80, 230], 4: [215, 200], 5: [285, 200] },
    beats: [
      ['Set', 1.0, '4 and 5 side by side at the elbows with a gap between them. 2 under the rim.', { dr: true }],
      ['Doors close', 1.6, '2 runs up through the gap, then 4 and 5 step together to shut the doors.', { m: { 2: [[250, 150], [250, 302]], 4: [[238, 205]], 5: [[262, 205]] }, s: [4, 5], pc: { 2: 'explode', 4: 'late', 5: 'late' }, dr: true }],
      ['Pass', 1.0, '1 hits 2 at the top.', { b: ['pass', 2, 0.1, 0.6] }],
      ['Three', 1.3, '2 shoots.', { b: ['shot', 0.15, 0.7] }],
    ],
  }),
  // ---------- Batch 2: harder reads, matchups and defense ----------
  def({
    id: 'short-roll', level: 'Advanced', name: 'Short roll vs the blitz', cat: 'Pick and roll',
    blurb: 'Both defenders trap the ball, so 5 short-rolls to the free-throw line for a 4-on-3.',
    start: { 1: [250, 330], 2: [20, 36], 3: [480, 36], 4: [70, 220], 5: [330, 190] },
    beats: [
      ['Set', 1.2, '1 at the top of the key. Shooters in both corners, 4 on the left wing, 5 at the right elbow.', { dr: true }],
      ['Screen', 1.4, '5 comes up and sets a ball screen on 1\'s right side.', { m: { 5: [[300, 250], [282, 300]] }, s: [5], dr: true }],
      ['Blitz', 1.4, 'X1 and X5 both jump the ball. 5 slips into the open space at the free-throw line.', { m: { 1: [[312, 318]], 5: [[268, 232]] }, dr: true }],
      ['Pass', 1.0, '1 gets it over the trap to 5.', { b: ['pass', 5, 0.1, 0.55] }],
      ['Floater', 1.3, '5 catches in the middle, takes one dribble and floats it in.', { m: { 5: [[258, 150]] }, b: ['shot', 0.45, 0.85] }],
    ],
  }),
  def({
    id: 'reject', level: 'Advanced', name: 'Reject the screen', cat: 'Pick and roll',
    blurb: 'X1 jumps to the screen side to take it away, so 1 rejects it and drives the other way.',
    start: { 1: [250, 330], 2: [20, 36], 3: [480, 36], 4: [430, 220], 5: [330, 190] },
    beats: [
      ['Set', 1.2, '1 at the top. 4 on the right wing, shooters in both corners, the left wing empty.', { dr: true }],
      ['Screen', 1.4, '5 comes up to screen on 1\'s right. X1 jumps to that side to take the screen away.', { m: { 5: [[300, 250], [282, 300]] }, s: [5], dr: true }],
      ['Reject', 1.5, '1 rejects the screen and drives left, the side X1 just gave up.', { m: { 1: [[205, 300], [175, 200], [200, 110]] }, pc: { 1: 'explode' } }],
      ['Layup', 1.3, '1 finishes on the left side.', { m: { 1: [[222, 72]] }, b: ['shot', 0.3, 0.7] }],
    ],
  }),
  def({
    id: 'post-double', level: 'Advanced', name: 'Beat the post double', cat: 'Post', ball: 2,
    blurb: '5 gets doubled from the wing and kicks it right back to where the double came from.',
    start: { 1: [250, 330], 2: [425, 215], 3: [60, 60], 4: [90, 230], 5: [335, 85] },
    beats: [
      ['Entry', 1.2, '2 throws it into 5 on the right block.', { b: ['pass', 5, 0.2, 0.65] }],
      ['Double', 1.4, 'X2 leaves 2 and runs down to double 5. 2 spots up.', { m: { 2: [[440, 235]] } }],
      ['Kick out', 1.0, '5 kicks it right back out to 2, where the double came from.', { b: ['pass', 2, 0.1, 0.55] }],
      ['Three', 1.3, '2 shoots the open three.', { b: ['shot', 0.15, 0.7] }],
    ],
  }),
  def({
    id: 'closeout', level: 'Intermediate', name: 'Attack the closeout', cat: 'Drives',
    blurb: '1 drives and kicks. X3 flies out at 3, so 3 shot-fakes and drives right past.',
    start: { 1: [250, 330], 2: [20, 36], 3: [440, 215], 4: [60, 220], 5: [150, 90] },
    beats: [
      ['Set', 1.0, '1 at the top, 3 on the right wing, the right corner empty.', { dr: true }],
      ['Drive', 1.4, '1 drives the right side of the lane. X3 sags off to help.', { m: { 1: [[285, 260], [300, 175]] }, pc: { 1: 'early' } }],
      ['Kick out', 1.0, '1 kicks it to 3. X3 sprints out at 3 with his hands up.', { b: ['pass', 3, 0.05, 0.5] }],
      ['Blow by', 1.4, '3 shot-fakes, X3 flies past, and 3 drives baseline.', { m: { 3: [[455, 150], [390, 80]] }, pc: { 3: 'explode' } }],
      ['Finish', 1.2, '3 finishes at the rim.', { m: { 3: [[300, 62]] }, b: ['shot', 0.3, 0.7] }],
    ],
  }),
  def({
    id: 'zone-skip', level: 'Intermediate', name: 'Skip it over the zone', cat: 'Vs zone', defense: 'zone', zone: '2-3',
    blurb: 'The 2-3 zone slides to the ball, so 2 skips it over the top to the far corner.',
    start: { 1: [250, 320], 2: [430, 215], 3: [480, 36], 4: [20, 36], 5: [250, 190] },
    beats: [
      ['Set', 1.0, 'Against a 2-3 zone: 1 up top, 2 on the right wing, 3 and 4 in the corners, 5 at the free-throw line.', { dr: true }],
      ['Swing', 1.0, '1 swings it to 2 on the right wing.', { b: ['pass', 2, 0.1, 0.6] }],
      ['Shift', 1.2, 'The whole zone slides over to 2. 2 holds it high.', { dr: true }],
      ['Skip', 1.2, '2 skips it over the top to 4 in the far corner.', { b: ['pass', 4, 0.05, 0.75] }],
      ['Three', 1.3, '4 catches and shoots.', { b: ['shot', 0.15, 0.7] }],
    ],
  }),
  def({
    id: 'switch-seal', level: 'Advanced', name: 'Punish the switch', cat: 'Matchups',
    looks: { o5: { height: 1.26 }, d1: { height: 0.78 } },
    blurb: 'The defense switches the ball screen and leaves a little guard on 5, so 5 seals him in the post.',
    start: { 1: [250, 330], 2: [20, 36], 3: [480, 36], 4: [70, 220], 5: [330, 190] },
    beats: [
      ['Set', 1.2, '1 at the top, 5 at the right elbow.', { dr: true }],
      ['Screen', 1.4, '5 comes up and sets a ball screen on 1\'s right side.', { m: { 5: [[300, 250], [282, 300]] }, s: [5], dr: true }],
      ['Switch', 1.4, 'They switch: X5 takes 1, and little X1 is stuck on 5.', { m: { 1: [[330, 300], [365, 268]], 5: [[300, 240]] }, dr: true }],
      ['Seal', 1.3, '5 pins X1 on his back and walks him down to the block.', { m: { 5: [[315, 140], [318, 98]] }, dr: true }],
      ['Entry', 1.0, '1 throws it over the top to 5.', { b: ['pass', 5, 0.1, 0.6] }],
      ['Finish', 1.2, '5 turns and scores over the little guy.', { m: { 5: [[290, 70]] }, b: ['shot', 0.3, 0.7] }],
    ],
  }),
  def({
    id: 'floater-drop', level: 'Advanced', name: 'Floater over the big', cat: 'Matchups',
    looks: { o1: { height: 0.84 }, d5: { height: 1.34 } },
    blurb: 'Their giant center drops back to the rim, so 1 floats it over him from the lane.',
    start: { 1: [250, 330], 2: [20, 36], 3: [480, 36], 4: [70, 220], 5: [330, 190] },
    beats: [
      ['Set', 1.2, '1 at the top, 5 at the right elbow. Their center is huge.', { dr: true }],
      ['Screen', 1.4, '5 comes up and sets a ball screen on 1\'s right side.', { m: { 5: [[300, 250], [282, 300]] }, s: [5], dr: true }],
      ['Drive', 1.4, '1 comes off the screen into the lane. Their big drops back to wait at the rim.', { m: { 1: [[320, 290], [300, 215], [276, 168]], 5: [[310, 230], [330, 150]] } }],
      ['Floater', 1.4, '1 floats it over the big man before he can get there.', { m: { 1: [[270, 156]] }, b: ['shot', 0.15, 0.75] }],
    ],
  }),
  def({
    id: 'low-man', level: 'Advanced', name: 'Low man help', cat: 'Defense', ball: 2,
    blurb: 'Defense: 2 beats X2 baseline, so X5 rotates over from the weak side to stop the layup.',
    start: { 1: [250, 330], 2: [430, 215], 3: [70, 220], 4: [20, 36], 5: [175, 85] },
    beats: [
      ['Set', 1.0, '2 has it on the right wing. X5 guards 5 on the weak-side block.', { dr: true }],
      ['Baseline drive', 1.4, '2 beats X2 baseline.', { m: { 2: [[460, 140], [395, 75]] }, pc: { 2: 'explode' } }],
      ['Stop', 1.2, 'X5 slides over and meets 2 in front of the rim. 2 has to pick it up.', { m: { 2: [[372, 72]] } }],
      ['Kick out', 1.0, '2 kicks it back out to 1. No layup.', { b: ['pass', 1, 0.1, 0.6] }],
    ],
  }),
  def({
    id: 'help-side', level: 'Intermediate', name: 'Two passes away', cat: 'Defense',
    blurb: 'Defense: when your player is two passes from the ball, sink into the lane to help.',
    start: { 1: [250, 330], 2: [430, 215], 3: [480, 36], 4: [20, 36], 5: [330, 90] },
    beats: [
      ['Set', 1.0, '1 has it up top. X4 guards 4 in the left corner.', { dr: true }],
      ['Swing', 1.0, '1 swings it to 2 on the right wing. Now 4 is two passes away.', { b: ['pass', 2, 0.1, 0.6] }],
      ['Drive', 1.5, '2 drives middle and runs straight into X4, waiting in the lane.', { m: { 2: [[370, 180], [318, 152]] } }],
      ['Kick out', 1.0, '2 has to pick it up and kick it back to 1.', { b: ['pass', 1, 0.1, 0.6] }],
    ],
  }),
  def({
    id: 'tag-roll', level: 'Advanced', name: 'Tag the roller', cat: 'Defense',
    blurb: 'Defense: on a pick and roll, the weak-side defender steps into the lane to stop the roll.',
    start: { 1: [250, 330], 2: [20, 36], 3: [480, 36], 4: [70, 220], 5: [330, 190] },
    beats: [
      ['Set', 1.2, '1 at the top, 5 at the right elbow. X4 guards 4 on the left wing.', { dr: true }],
      ['Screen', 1.4, '5 comes up and sets a ball screen on 1\'s right side. X5 jumps out to stop the ball.', { m: { 5: [[300, 250], [282, 300]] }, s: [5], dr: true }],
      ['Roll', 1.6, '1 comes off the screen. 5 rolls hard to the rim, and X4 steps into the lane in front of him.', { m: { 1: [[320, 300], [372, 258]], 5: [[300, 200], [272, 130]] }, pc: { 5: 'explode' } }],
      ['No lane', 1.2, 'The lob to 5 isn\'t there. 1 swings it to 3 in the corner, and X4 gets back to 4.', { b: ['pass', 3, 0.15, 0.7] }],
    ],
  }),
  def({
    id: 'under-screen', level: 'Advanced', name: 'Over or under?', cat: 'Defense',
    blurb: 'Defense: the ball handler can\'t shoot, so X1 goes under the screen and meets him on the other side.',
    start: { 1: [250, 335], 2: [20, 36], 3: [480, 36], 4: [70, 220], 5: [330, 190] },
    beats: [
      ['Set', 1.2, '1 has it up top. 1 is quick but not a shooter.', { dr: true }],
      ['Screen', 1.4, '5 comes up and sets a ball screen on 1\'s right side.', { m: { 5: [[300, 255], [284, 305]] }, s: [5], dr: true }],
      ['Under', 1.4, 'X1 slips under the screen and beats 1 to the other side. No lane.', { m: { 1: [[318, 318], [352, 292]] }, dr: true }],
      ['Reset', 1.2, '1 has nowhere to go and gives it up to 4.', { b: ['pass', 4, 0.15, 0.7] }],
    ],
  }),
  // ---------- Batch 3: named plays, and what to do when the defense breaks them ----------
  def({
    id: 'horns-pop', level: 'Advanced', name: 'Horns: the pop', cat: 'Named plays',
    blurb: 'Horns: 5 screens and rolls. When 4\'s defender sinks to stop the roll, 4 pops open.',
    start: { 1: [250, 330], 2: [18, 36], 3: [482, 36], 4: [180, 190], 5: [320, 190] },
    beats: [
      ['Set', 1.2, 'Horns: 4 and 5 at the elbows, 2 and 3 in the corners.', { dr: true }],
      ['Screen', 1.4, '5 steps up to screen for 1.', { m: { 5: [[285, 300]] }, s: [5], dr: true }],
      ['Roll and pop', 1.8, '1 comes off the screen. 5 rolls to the rim, and 4\'s defender sinks to stop him. 4 pops to the wing.', { m: { 1: [[330, 295], [360, 270]], 5: [[300, 190], [270, 92]], 4: [[150, 250], [140, 290]] }, pc: { 5: 'explode' } }],
      ['Pass', 1.0, '1 throws it across to 4.', { b: ['pass', 4, 0.1, 0.65] }],
      ['Jumper', 1.3, '4 catches and shoots.', { b: ['shot', 0.15, 0.7] }],
    ],
  }),
  def({
    id: 'spain-roll', level: 'Advanced', name: 'Spain: hit the roll', cat: 'Named plays',
    blurb: 'Spain pick and roll: 2 back-screens 5\'s defender. When 2\'s defender stays home, 5 is open on the roll.',
    start: { 1: [250, 330], 2: [90, 236], 3: [480, 36], 4: [20, 36], 5: [330, 190] },
    beats: [
      ['Set', 1.0, '1 up top, 5 at the right elbow, 2 on the left wing.', { dr: true }],
      ['Ball screen', 1.4, '5 sets a ball screen for 1.', { m: { 5: [[285, 300]] }, s: [5], dr: true }],
      ['Back screen', 1.7, "1 drives right. 5 rolls while 2 back-screens 5's defender.", { m: { 1: [[330, 296], [372, 258]], 5: [[300, 200], [268, 95]], 2: [[190, 215], [262, 226]] }, s: [2], pc: { 5: 'explode' } }],
      ['Pass', 1.0, '2\'s defender stayed with 2, so 1 hits 5 rolling to the rim.', { b: ['pass', 5, 0.1, 0.55] }],
      ['Finish', 1.3, '5 lays it in.', { m: { 5: [[258, 72]] }, b: ['shot', 0.3, 0.7] }],
    ],
  }),
  def({
    id: 'chicago-back', level: 'Advanced', name: 'Chicago: backdoor', cat: 'Named plays',
    blurb: 'Chicago: a pin-down into a handoff. When 2\'s defender jumps the handoff, 2 cuts backdoor.',
    start: { 1: [250, 320], 2: [130, 60], 3: [440, 60], 4: [120, 170], 5: [330, 190] },
    beats: [
      ['Pass to the slot', 1.2, '5 lifts to the left slot and 1 passes to 5.', { m: { 5: [[260, 260], [195, 300]] }, b: ['pass', 5, 0.5, 0.85] }],
      ['Pin-down', 1.5, '4 screens down and 2 comes up off it, heading for the handoff.', { m: { 4: [[140, 105]], 2: [[100, 140], [140, 240]] }, s: [4], pc: { 2: 'explode' } }],
      ['Backdoor', 1.4, 'X2 jumps ahead of the handoff, so 2 plants and cuts backdoor.', { m: { 2: [[158, 262], [205, 150], [232, 92]] }, pc: { 2: 'explode' }, b: ['pass', 2, 0.55, 0.92] }],
      ['Layup', 1.2, '2 lays it in.', { m: { 2: [[245, 70]] }, b: ['shot', 0.15, 0.65] }],
    ],
  }),
  def({
    id: 'flex-high', level: 'Advanced', name: 'Flex: over the top', cat: 'Named plays',
    blurb: 'The Flex cut: when the cutter\'s defender cheats baseline, the cutter goes over the top into the middle.',
    start: { 1: [90, 240], 2: [400, 240], 3: [482, 36], 4: [180, 240], 5: [330, 74] },
    beats: [
      ['Set', 1.0, '1 has it on the left wing. 5 on the right block, 3 in the right corner.', { dr: true }],
      ['Flex screen', 1.3, '5 sets the flex screen. X3 cheats to the baseline side to beat 3 there.', { s: [5], dr: true }],
      ['Over the top', 1.5, '3 cuts over the top of the screen into the middle.', { m: { 3: [[395, 115], [310, 140], [245, 135]] }, pc: { 3: 'explode' }, b: ['pass', 3, 0.7, 0.95] }],
      ['Layup', 1.2, '3 takes one step and lays it in.', { m: { 3: [[240, 85]] }, b: ['shot', 0.3, 0.75] }],
    ],
  }),
];