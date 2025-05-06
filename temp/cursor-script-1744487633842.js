
      const fs = require('fs');
      
      // Read the diagram image
      const diagramPath = "C:\\Users\\rstec\\collaborative-editor\\mern-chat-app\\temp\\diagram-1744487633842.png";
      const imageBuffer = fs.readFileSync(diagramPath);
      const base64Image = imageBuffer.toString('base64');
      
      // Define render output path
      const renderPath = "C:\\Users\\rstec\\collaborative-editor\\mern-chat-app\\temp\\render-1744487633842.png";
      
      // Function to handle the Blender code generation and execution
      async function generateAndRenderScene() {
        try {
          console.log("Sending image to Claude via MCP...");
          
          // Create a prompt that requests a Blender model of the diagram
          const prompt = `
            Analyze this diagram and create detailed Blender Python code that accurately recreates it as a 3D model.
            Include all components shown with correct labels.
            Just respond with Python code that can be executed in Blender, no explanations.
            The code should include rendering setup at the end.
          `;
          
          // This needs to match your Cursor MCP API - adjust as needed
          const { cursor } = require('@cursor/cursor-api');
          const response = await cursor.chat.complete(prompt, {
            attachments: [
              {
                type: "image", 
                data: base64Image
              }
            ]
          });
          
          console.log("Received response from Claude");
          
          // Extract Python code from the response
          const text = response.text || response.toString();
          const codeMatch = text.match(/```python\n([\s\S]*?)\n```/) || 
                           text.match(/```([\s\S]*?)```/);
                           
          if (!codeMatch) {
            console.error("No code found in Claude response");
            return false;
          }
          
          // Add rendering code to the extracted Blender code
          const blenderCode = codeMatch[1] + `
          
          # Setup rendering
          import bpy
          bpy.context.scene.render.filepath = "C:\\Users\\rstec\\collaborative-editor\\mern-chat-app\\temp\\render-1744487633842.png"
          bpy.context.scene.render.resolution_x = 1200
          bpy.context.scene.render.resolution_y = 800
          bpy.context.scene.render.film_transparent = True
          bpy.ops.render.render(write_still=True)
          print(f"Render saved to: {bpy.context.scene.render.filepath}")
          `;
          
          // Execute the code in Blender via MCP
          console.log("Executing Blender code...");
          const { mcp_blender_execute_blender_code } = require('@cursor/mcp');
          const result = await mcp_blender_execute_blender_code({ code: blenderCode });
          console.log("Blender execution complete");
          
          return true;
        } catch (error) {
          console.error("Error in generateAndRenderScene:", error);
          return false;
        }
      }
      
      // Execute and report back
      generateAndRenderScene().then(success => {
        console.log("Scene generation " + (success ? "succeeded" : "failed"));
      });
    