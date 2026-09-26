import Publication from '../models/Publication.js';
import Membership from '../models/Membership.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const removeFile = async file => { if (file) await fs.unlink(path.resolve(file)).catch(() => {}); };
const isPdf = async file => {
  if (!file) return false;
  const handle = await fs.open(file.path, 'r');
  try { const buffer = Buffer.alloc(5); await handle.read(buffer, 0, 5, 0); return buffer.toString() === '%PDF-'; }
  finally { await handle.close(); }
};

export async function listMyPublications(req, res, next) {
  try { res.json({ success: true, data: await Publication.find({ user: req.user._id }).sort({ createdAt: -1 }).lean() }); }
  catch (error) { next(error); }
}

export async function createPublication(req, res, next) {
  try {
    const approved = await Membership.exists({ user: req.user._id, status: 'approved' });
    if (!approved) { await removeFile(req.file?.path); return res.status(403).json({ success: false, message: 'Only approved members can submit publications.' }); }
    if (!req.file) return res.status(400).json({ success: false, message: 'Upload the manuscript as a PDF.' });
    if (!await isPdf(req.file)) { await removeFile(req.file.path); return res.status(400).json({ success: false, message: 'The uploaded file is not a valid PDF.' }); }
    const publication = await Publication.create({ user: req.user._id, title: req.body.title, type: req.body.type, abstract: req.body.abstract, manuscriptFile: req.file.path, originalFileName: req.file.originalname, fileSize: req.file.size });
    res.status(201).json({ success: true, message: 'Publication submitted for review.', data: publication });
  } catch (error) { await removeFile(req.file?.path); next(error); }
}

export async function replacePublication(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Upload the improved manuscript as a PDF.' });
    if (!await isPdf(req.file)) { await removeFile(req.file.path); return res.status(400).json({ success: false, message: 'The uploaded file is not a valid PDF.' }); }
    const item = await Publication.findOne({ _id: req.params.id, user: req.user._id });
    if (!item) { await removeFile(req.file.path); return res.status(404).json({ success: false, message: 'Publication not found.' }); }
    if (!['rejected', 'revision-requested'].includes(item.status)) { await removeFile(req.file.path); return res.status(409).json({ success: false, message: 'A manuscript can only be replaced after rejection or a revision request.' }); }
    const oldFile = item.manuscriptFile;
    item.manuscriptFile = req.file.path; item.originalFileName = req.file.originalname; item.fileSize = req.file.size;
    item.version += 1; item.status = 'pending'; item.reviewReason = ''; item.reviewedBy = null; item.reviewedAt = null; item.publishedAt = null;
    await item.save();
    await removeFile(oldFile);
    res.json({ success: true, message: 'Improved manuscript uploaded and resubmitted.', data: item });
  } catch (error) { await removeFile(req.file?.path); next(error); }
}

export async function downloadPublication(req, res, next) {
  try {
    const item = await Publication.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Publication not found.' });
    const owns = String(item.user) === String(req.user._id);
    const assigned = String(item.assignedReviewer || '') === String(req.user._id);
    if (!owns && req.user.role !== 'admin' && !assigned) return res.status(403).json({ success: false, message: 'You cannot access this manuscript.' });
    if (!item.manuscriptFile && item.manuscriptUrl) return res.redirect(item.manuscriptUrl);
    if (!item.manuscriptFile) return res.status(404).json({ success: false, message: 'This legacy submission does not have an uploaded PDF.' });
    res.download(path.resolve(item.manuscriptFile), item.originalFileName);
  } catch (error) { next(error); }
}
