import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';

const profilesDir=path.resolve('uploads/profiles');
const cvsDir=path.resolve('uploads/cvs');
[profilesDir,cvsDir].forEach(directory=>fs.mkdirSync(directory,{recursive:true}));

const storage=multer.diskStorage({
  destination:(req,file,callback)=>callback(null,file.fieldname==='profilePicture'?profilesDir:cvsDir),
  filename:(req,file,callback)=>callback(null,`${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

export const membershipUpload=multer({
  storage,
  limits:{fileSize:10*1024*1024,files:2},
  fileFilter:(req,file,callback)=>{
    const validImage=file.fieldname==='profilePicture'&&['image/jpeg','image/png','image/webp'].includes(file.mimetype);
    const validCv=file.fieldname==='cv'&&file.mimetype==='application/pdf';
    callback(validImage||validCv?null:new multer.MulterError('LIMIT_UNEXPECTED_FILE',file.fieldname),validImage||validCv);
  },
});
