import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const img_type = req?.body?.image_type;
    callback(null, path.join("images/", img_type));
  },
  filename: (req, file, callback) => {
    const ext = path.extname(file.originalname);
    callback(
      null,
      Date.now() + "-" + Math.floor(1000000 + Math.random() * 9000000) + ext
    );
  },
});

const fileFilter = (req, file, callback) => {
  const allowedTypes = /jpeg|jpg|png/;
  const isValid =
    allowedTypes.test(file.mimetype) &&
    allowedTypes.test(path.extname(file.originalname).toLocaleLowerCase());

  if (isValid) {
    callback(null, true);
  } else {
    callback(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024, // Limit 3 MB
  },
  fileFilter,
});

export default upload;
