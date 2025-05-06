
      import fs from 'fs';
      
      // Read the diagram image
      const diagramPath = "C:\\Users\\rstec\\collaborative-editor\\mern-chat-app\\temp\\diagram-1744501205584.png";
      const imageBuffer = fs.readFileSync(diagramPath);
      const base64Image = imageBuffer.toString('base64');
      
      // Define render output path
      const renderPath = "C:\\Users\\rstec\\collaborative-editor\\mern-chat-app\\temp\\render-1744501205584.png";
      
      async function generateModel() {
        try {
          console.log("Starting Blender generation process...");
          
          // Import the cursor API
          const { cursor } = await import('@cursor/cursor-api');
          
          // Create the prompt for model generation
          const prompt = `
            Analyze this diagram and create detailed Blender Python code that accurately recreates it as a 3D model.
            The code should include proper setup, materials, and camera positioning.
            Make sure to include rendering code that saves the output to the specified path.
          `;
          
          console.log("Sending image to Claude...");
          const response = await cursor.chat.complete(prompt, {
            attachments: [{ type: "image", data: base64Image }]
          });
          
          console.log("Received response from Claude");
          
          // Extract Python code from the response
          const text = response.text || response.toString();
          console.log("Claude response length:", text.length);
          
          const codeMatch = text.match(/```python\n([\s\S]*?)\n```/) || 
                           text.match(/```([\s\S]*?)```/);
          
          if (!codeMatch) {
            console.error("No code found in Claude response");
            return false;
          }
          
          // Add explicit rendering code to ensure output is saved
          const blenderCode = codeMatch[1] + `
          
          # Setup rendering
          import bpy
          
          # Ensure the render path is set
          print("Setting render filepath to: C:\\Users\\rstec\\collaborative-editor\\mern-chat-app\\temp\\render-1744501205584.png")
          bpy.context.scene.render.filepath = "C:\\Users\\rstec\\collaborative-editor\\mern-chat-app\\temp\\render-1744501205584.png"
          bpy.context.scene.render.resolution_x = 1200
          bpy.context.scene.render.resolution_y = 800
          bpy.context.scene.render.film_transparent = True
          
          # Force render and save
          print("Starting render...")
          bpy.ops.render.render(write_still=True)
          print(f"Render completed and saved to: {bpy.context.scene.render.filepath}")
          `;
          
          console.log("Executing Blender code via MCP...");
          // Import and use the MCP Blender execution function
          const { mcp_blender_execute_blender_code } = await import('@cursor/mcp');
          
          console.log("MCP module imported successfully");
          const result = await mcp_blender_execute_blender_code({ code: blenderCode });
          console.log("Blender execution complete with result:", JSON.stringify(result));
          
          return true;
        } catch (error) {
          console.error("Error in generateModel:", error);
          return false;
        }
      }
      
      // Execute the model generation and log results
      generateModel().then(success => {
        console.log("Model generation " + (success ? "succeeded" : "failed"));
        if (success) {
          console.log("Checking for render file:", "C:\\Users\\rstec\\collaborative-editor\\mern-chat-app\\temp\\render-1744501205584.png");
          if (fs.existsSync("C:\\Users\\rstec\\collaborative-editor\\mern-chat-app\\temp\\render-1744501205584.png")) {
            console.log("Render file exists!");
          } else {
            console.log("Render file does not exist!");
          }
        }
      });
    