export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  dependencies: string[];
};

export type PluginDefinition = {
  manifest: PluginManifest;
};
