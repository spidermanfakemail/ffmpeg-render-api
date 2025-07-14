const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");
const app = express();

app.use(bodyParser.json({ limit: "100mb" }));

app.post("/render", async (req, res) => {
  const { imageUrl, audioUrl, quoteText } = req.body;
  const id = Date.now();
  const imagePath = `image-${id}.jpg`;
  const audioPath = `audio-${id}.mp3`;
  const videoPath = `video-${id}.mp4`;

  try {
    const download = async (url, output) => {
      const resp = await fetch(url);
      const buf = await resp.buffer();
      fs.writeFileSync(output, buf);
    };

    await download(imageUrl, imagePath);
    await download(audioUrl, audioPath);

    const cmd = `ffmpeg -y -loop 1 -i ${imagePath} -i ${audioPath} -vf "drawtext=text='${quoteText}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h-60" -shortest -t 60 -preset veryfast -movflags +faststart ${videoPath}`;

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(stderr);
        return res.status(500).send("FFmpeg render failed");
      }
      res.json({ message: "Rendered", videoUrl: `https://ffmpeg-render-api-zuz9.onrender.com/video/${filename} });
    });
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error");
  }
});

app.use("/video", express.static(path.join(__dirname)));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
