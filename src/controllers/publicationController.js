import Publication from '../models/Publication.js';

export async function listMyPublications(req, res, next) {
  try { res.json({ success: true, data: await Publication.find({ user: req.user._id }).sort({ createdAt: -1 }).lean() }); }
  catch (error) { next(error); }
}

export async function createPublication(req, res, next) {
  try {
    const publication = await Publication.create({ user: req.user._id, title: req.body.title, type: req.body.type, abstract: req.body.abstract, manuscriptUrl: req.body.manuscriptUrl });
    res.status(201).json({ success: true, message: 'Publication submitted for review.', data: publication });
  } catch (error) { next(error); }
}
