
import fs from 'fs';
import path from 'path';

// Execution function to handle MCP calls
async function executeCommand() {
  try {
    const { mcp_blender_get_scene_info } = await import('@cursor/mcp');
    const sceneInfo = await mcp_blender_get_scene_info({ random_string: "get_scene" });
    return sceneInfo;
  } catch (error) {
    console.error('Error getting scene info:', error);
    return { error: error.message };
  }
}

// Execute and log results
executeCommand().then(result => {
  console.log(JSON.stringify(result));
});
