/**
 * Rendering switches of the 3D twin (performance). Change a value and reload the twin page.
 */

/**
 * Draw each equipment's static opaque parts merged, one mesh per material, while they look alike
 * (viewer/twin-batch batchEquipment): a few draw calls per equipment instead of one per part. The
 * parts are still what is picked, hovered, tinted and hidden; a part that looks different is drawn
 * on its own. false draws every part itself.
 */
export const RENDER_BATCH_EQUIPMENT = true;

/**
 * Animation (rotating parts, the OHT) redraws the scene at most every 33 ms, and no more often
 * than this many times as long as a frame takes to draw: a heavy scene animates at a lower rate
 * instead of keeping the page busy (camera moves still draw every frame).
 */
export const RENDER_ANIM_COST_FACTOR = 2;

/**
 * The site view (both buildings) draws the buildings' insides and their equipment only while the
 * camera (or the walker) is within this many metres of them; from further away the envelopes stand
 * alone. Their screens are not polled while they are not drawn. 0 draws everything.
 */
export const RENDER_NEAR_M = 60;
