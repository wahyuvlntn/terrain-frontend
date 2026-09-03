/**
 * location: backend location · equipment: a placed 3D model · structure: building context geometry
 * (room shell, roof) of a location · scene / group: twin-only containers
 */
export type TwinLocationType = 'location' | 'equipment' | 'structure' | 'scene' | 'group';

export type TwinModelRef = {
  /** GLB url (served from /public or the file server) */
  url: string;
  /** Placement in the scene frame, in metres (three.js Y-up: Blender (x, y, z) -> (x, z, -y)) */
  position?: [number, number, number];
  /** Rotation around the vertical axis, in degrees */
  rotationY?: number;
  /** Replacements for the GLB's dt_* strings when one model stands for several units */
  retag?: Record<string, string>;
  /** Site context around the scope (a neighbouring building, the pipe bridge): drawn, not framed */
  context?: boolean;
  /** Also drawn in the views of the location's sub-locations (the cleanroom shell around a bay) */
  enclosing?: boolean;
};

/** A parameter shown on a display face, with its label */
export type TwinScreenRow = { alias: string; label: string };

/** Rows of the HMI screen and the single big-number row of the VFD keypad */
/** rows of the HMI face and the single value of the drive (VFD) display, when the model has one */
export type TwinScreenConfig = { hmi: TwinScreenRow[]; vfd?: TwinScreenRow };

/**
 * Spin rate of a model's dt_spin parts from a live parameter: rate = value / full, where the GLB's
 * dt_spin_rps is the speed at `full` (e.g. a tower fan at 100 %, a pump at 50 Hz).
 */
export type TwinMotion = { param: string; full: number };

/**
 * Where walk mode (first person) puts the player: feet position in three.js metres and heading in
 * radians (0 looks toward −Z = Blender +Y, "north"; π/2 west, −π/2 east, π south)
 */
export type TwinSpawn = { position: [number, number, number]; yaw: number };

export type TwinLocation = {
  id: string;
  name: string;
  type: TwinLocationType;
  /** Backend location id (location-overview API) */
  locationId?: number;
  /** Depth in the backend location hierarchy */
  level?: number;
  description?: string;
  /** Equipment model (type 'equipment') */
  model?: TwinModelRef;
  /** Alias of the backend equipment this model represents (live status, details) */
  asset?: string;
  /** 3D tag -> parameter alias bindings for live values */
  params?: Record<string, string>;
  /** What the model's HMI / VFD display faces show (see digital-twin.bindings.ts) */
  screens?: TwinScreenConfig;
  /** Live parameter that sets the spin rate of the model's moving parts (else full speed) */
  motion?: TwinMotion;
  children?: TwinLocation[];
  /**
   * Building context geometry of this location (type 'structure': walls, slabs, roof). Kept out of
   * `children`, so it never shows in the tree or the details list; rendered with every scope that
   * contains this location.
   */
  structures?: TwinLocation[];
  /** Walk-mode entry point of this location (from its scene, in the shared building frame) */
  spawn?: TwinSpawn;
};

/** Which backend location a scene / model belongs to: id is preferred, the exact name is a fallback */
export type TwinBinding = {
  locationId?: number;
  locationName?: string;
};

export type TwinSceneModel = {
  key: string;
  name: string;
  url: string;
  position?: [number, number, number];
  rotationY?: number;
  /** Replacements for the GLB's dt_* strings, e.g. { 'CH-01': 'CH-02' } for a shared chiller model */
  retag?: Record<string, string>;
  /** Overrides the scene binding, e.g. a cooling tower that lives on the roof */
  bind?: TwinBinding;
  /** Alias of the backend equipment (asset.equipment.alias) */
  asset?: string;
  /** 3D tag -> parameter alias bindings (see digital-twin.bindings.ts) */
  params?: Record<string, string>;
  /** Live rows for the model's HMI / VFD display faces */
  screens?: TwinScreenConfig;
  /** Live parameter that sets the spin rate of the moving parts (fan / pump speed) */
  motion?: TwinMotion;
  /**
   * Context geometry (room shell, roof slab) instead of equipment: attached to the location as a
   * structure, not a child; the viewer renders it but doesn't make it pickable, ghosted or badged.
   */
  structure?: boolean;
  /**
   * With `structure`: site context outside the location itself (the neighbouring building, the
   * utility bridge between them). Rendered with the scope but left out of its framing, ground and
   * zoom range, so the location's own view is unchanged.
   */
  context?: boolean;
  /**
   * With `structure`: also rendered when one of the location's sub-locations is the scope (the
   * cleanroom shell, ceiling and wafer transport around each of its bays).
   */
  enclosing?: boolean;
};

/** A set of models sharing one coordinate frame (e.g. a chiller plant and its condenser water loop) */
export type TwinScene = {
  id: string;
  name: string;
  description?: string;
  bind?: TwinBinding;
  /** Placement of the whole scene in the shared building frame (three.js metres), e.g. a roof level */
  origin?: [number, number, number];
  models: TwinSceneModel[];
  /**
   * Walk-mode entry point of the scene's location, relative to `origin` (e.g. just inside the
   * room's door, facing in)
   */
  spawn?: TwinSpawn;
};

export type TwinNodeKind = 'location' | 'equipment' | 'group' | 'part';

/** A node of the drill-down hierarchy: locations from the API, equipment/groups/parts from the GLB */
export type TwinNode = {
  id: string;
  name: string;
  kind: TwinNodeKind;
  parentId?: string;
  /** dt_* custom properties exported from Blender (glTF extras) */
  props: Record<string, unknown>;
  children: TwinNode[];
};
