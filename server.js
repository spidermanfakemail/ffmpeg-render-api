const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();
app.use(bodyParser.json({ limit: "100mb" }));

app.post("/render", async (req, res) => {
  const { videoUrls, audioUrl, quoteText } = req.body;
  const id = Date.now();
  const audioPath = `audio-${id}.mp3`;
  const concatListPath = `concat-${id}.txt`;
  const outputFilename = `video-${id}.mp4`;

  try {
    // Download audio
    const download = async (url, output) => {
      const resp = await fetch(url);
      const buf = await resp.buffer();
      fs.writeFileSync(output, buf);
    };

    await download(audioUrl, audioPath);

    // Download and prepare video files
    const videoFiles = [];
    for (let i = 0; i < videoUrls.length; i++) {
      const filePath = `vid${i}-${id}.mp4`;
      await download(videoUrls[i], filePath);
      videoFiles.push(filePath);
    }

    // Create concat file for FFmpeg
    const concatText = videoFiles.map(v => `file '${v}'`).join("\n");
    fs.writeFileSync(concatListPath, concatText);

    // FFmpeg command
    const cmd = `ffmpeg -y -f concat -safe 0 -i ${concatListPath} -i ${audioPath} -vf "drawtext=text='${quoteText.replace(/'/g, "\\'")}':fontcolor=white:fontsize=32:box=1:boxcolor=black@0.5:boxborderw=10:x=(w-text_w)/2:y=(h-text_h)/2" -shortest -preset veryfast -movflags +faststart ${outputFilename}`;

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error("FFmpeg error:", stderr);
        return res.status(500).json({ error: "FFmpeg render failed" });
      }

      res.json({
        message: "Rendered",
        videoUrl: `https://ffmpeg-render-api-zuz9.onrender.com/video/${outputFilename}`
      });
    });
  } catch (e) {
    console.error("Server error:", e);
    res.status(500).json({ error: "Server error", details: e.message });
  }
});

app.use("/video", express.static(path.join(__dirname)));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
