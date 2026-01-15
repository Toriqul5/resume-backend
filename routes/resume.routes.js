const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resume.controller');
const { ensureAuth } = require('../middlewares/auth.middleware');

/**
 * @route   GET /api/resumes
 * @desc    Get all resumes for authenticated user
 * @access  Private
 */
router.get('/', ensureAuth, resumeController.getAllResumes);

/**
 * @route   POST /api/resumes
 * @desc    Create a new resume
 * @access  Private
 */
router.post('/', ensureAuth, resumeController.createResume);

/**
 * @route   GET /api/resumes/:id
 * @desc    Get a specific resume
 * @access  Private
 */
router.get('/:id', ensureAuth, resumeController.getResume);

/**
 * @route   PUT /api/resumes/:id
 * @desc    Update a specific resume
 * @access  Private
 */
router.put('/:id', ensureAuth, resumeController.updateResume);

/**
 * @route   DELETE /api/resumes/:id
 * @desc    Delete a specific resume
 * @access  Private
 */
router.delete('/:id', ensureAuth, resumeController.deleteResume);

/**
 * @route   POST /api/resumes/migrate
 * @desc    Migrate localStorage resumes to database
 * @access  Private
 */
router.post('/migrate', ensureAuth, resumeController.migrateResumes);

/**
 * @route   GET /api/resumes/:id/download
 * @desc    Download a resume as PDF
 * @access  Private
 */
router.get('/:id/download', ensureAuth, resumeController.downloadResume);

module.exports = router;