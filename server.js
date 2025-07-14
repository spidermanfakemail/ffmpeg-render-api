const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const fetch = require("node-fetch");
const path = require("path");
const { exec } = require("child_process");

const app = express();
app.use(bodyParser.json({ limit: "100mb" }));

app.post("/render", async (req, res) => {
  const { videoUrls, audioUrl, quoteText } = req.body;
  const id = Date.now();
  const output = `video-${id}.mp4`;

  try {
    // Download videos
    const videoFiles = [];
    for (let i = 0; i < videoUrls.length; i++) {
      const videoResp = await fetch(videoUrls[i]);
      const buffer = await videoResp.buffer();
      const filename = `clip${i}.mp4`;
      fs.writeFileSync(filename, buffer);
      videoFiles.push(filename);
    }

    // Download audio
    const audioResp = await fetch(audioUrl);
    const audioBuffer = await audioResp.buffer();
    const audioFile = `audio-${id}.mp3`;
    fs.writeFileSync(audioFile, audioBuffer);

    // Create concat.txt file for FFmpeg
    const concatText = videoFiles.map(file => `file '${file}'`).join("\n");
    fs.writeFileSync("concat.txt", concatText);

    // FFmpeg command to combine and overlay quote
    const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i concat.txt -i ${audioFile} -vf "drawtext=text='${quoteText}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.5" -shortest ${output}`;

    exec(ffmpegCmd, (err, stdout, stderr) => {
      if (err) {
        console.error("FFmpeg error:", stderr);
        return res.status(500).send("FFmpeg render failed.");
      }
      res.json({ message: "Rendered", videoUrl: `/video/${output}` });
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Server error");
  }
});

app.use("/video", express.static(path.join(__dirname)));

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`✅ Server listening on port ${port}`));
