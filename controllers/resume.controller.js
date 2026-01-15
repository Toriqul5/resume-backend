const Resume = require('../models/Resume');
const User = require('../models/User');

/**
 * Get all resumes for authenticated user
 * GET /api/resumes
 */
exports.getAllResumes = async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user._id })
      .select('title createdAt updatedAt')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      resumes
    });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resumes'
    });
  }
};

/**
 * Create a new resume
 * POST /api/resumes
 */
exports.createResume = async (req, res) => {
  try {
    const { title, data, content, template } = req.body;
    
    console.log('📥 [CREATE] Creating resume request received');
    console.log('   Title:', title);
    console.log('   Data keys:', Object.keys(data || {}));
    console.log('   Content length:', content ? content.length : 0);
    console.log('   User ID:', req.user._id);
    
    // Validate required fields
    if (!title || !data) {
      console.log('❌ [CREATE] Missing required fields - title or data missing');
      return res.status(400).json({
        success: false,
        error: 'Title and data are required'
      });
    }
    
    // Check user's plan and resume count
    const user = await User.findById(req.user._id);
    if (!user) {
      console.log('❌ [CREATE] User not found:', req.user._id);
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Count existing resumes for this user
    const resumeCount = await Resume.countDocuments({ userId: req.user._id });
    
    // Check plan limits
    if (user.plan === 'free' && resumeCount >= 3) {
      console.log(`❌ [CREATE] Free plan limit exceeded for user ${req.user._id}`);
      return res.status(403).json({
        success: false,
        error: 'Free plan limit exceeded. You can only create 3 resumes. Upgrade to Pro or Business for unlimited access.',
        plan: user.plan,
        maxResumes: 3,
        currentResumes: resumeCount
      });
    }
    
    const resume = new Resume({
      userId: req.user._id,
      title,
      data,
      content: content || '', // Content might be added later after AI processing
      template: template || 'default'
    });
    
    console.log('✅ [CREATE] Resume object created, attempting to save...');
    
    await resume.save();
    
    console.log('✅ [CREATE] Resume saved successfully, ID:', resume._id);
    
    res.status(201).json({
      success: true,
      resume: {
        id: resume._id,
        title: resume.title,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ [CREATE] Error creating resume:', error);
    console.error('   Error name:', error.name);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    
    // Handle specific MongoDB/Mongoose errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: `Validation error: ${error.message}`
      });
    }
    
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Resume with this title already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: `Failed to create resume: ${error.message}`
    });
  }
};

/**
 * Get a specific resume
 * GET /api/resumes/:id
 */
exports.getResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }
    
    res.json({
      success: true,
      resume
    });
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resume'
    });
  }
};

/**
 * Update a specific resume
 * PUT /api/resumes/:id
 */
exports.updateResume = async (req, res) => {
  try {
    const { title, data, content, template } = req.body;
    
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }
    
    // Update fields if provided
    if (title) resume.title = title;
    if (data) resume.data = data;
    if (content) resume.content = content;
    if (template) resume.template = template;
    
    await resume.save();
    
    res.json({
      success: true,
      resume
    });
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update resume'
    });
  }
};

/**
 * Delete a specific resume
 * DELETE /api/resumes/:id
 */
exports.deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }
    
    await Resume.deleteOne({ _id: req.params.id });
    
    res.json({
      success: true,
      message: 'Resume deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete resume'
    });
  }
};

/**
 * Download a resume as HTML (can be saved as PDF by browser)
 * GET /api/resumes/:id/download
 */
exports.downloadResume = async (req, res) => {
  try {
    console.log(`\n📥 [DOWNLOAD] Download request for resume: ${req.params.id}`);
    console.log(`   User ID: ${req.user._id}`);
    
    // First, try to find the resume in the database
    let resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!resume) {
      console.log(`⚠️  [DOWNLOAD] Resume not found in database: ${req.params.id}`);
      
      // If not found in database, return appropriate error
      return res.status(404).json({
        success: false,
        error: 'Resume not found. Please recreate this resume to access download functionality.'
      });
    }
    
    console.log(`✅ [DOWNLOAD] Resume found: ${resume.title}`);
    
    // Generate HTML content for the resume
    const htmlContent = generateResumeHtml(resume);
    
    // Set headers for HTML download (which can be saved as PDF by the browser)
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.title.replace(/[^a-z0-9]/gi, '_')}.html"`);
    
    console.log(`✅ [DOWNLOAD] HTML generated successfully for: ${resume.title}`);
    
    // Send the HTML content
    res.send(htmlContent);
    
  } catch (error) {
    console.error('❌ [DOWNLOAD] Error downloading resume:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download resume'
    });
  }
};

/**
 * Generate HTML content for the resume
 */
function generateResumeHtml(resume) {
  const { data, content, title } = resume;
  
  // If content exists (AI-generated), use it; otherwise construct from data
  let resumeHtml = '';
  
  if (content && content.trim()) {
    // Use the AI-generated content directly
    resumeHtml = content;
  } else {
    // Construct resume from form data
    const portfolioLink = data.portfolio ? '<a href="' + data.portfolio + '">' + data.portfolio + '</a>' : '';
    resumeHtml = '<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">' +
      '<header style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px;">' +
        '<h1 style="margin: 0; color: #2c3e50; font-size: 28px;">' + (data.fullName || 'Name') + '</h1>' +
        '<h2 style="margin: 5px 0; color: #34495e; font-size: 20px; font-weight: normal;">' + (data.jobRole || 'Job Title') + '</h2>' +
        '<div style="margin-top: 10px; color: #7f8c8d; font-size: 14px;">' +
          '<div>' + (data.email || '') + ' | ' + (data.phone || '') + '</div>' +
          '<div>' + (data.location || '') + ' | ' + portfolioLink + '</div>' +
        '</div>' +
      '</header>' +
      
      '<section style="margin-bottom: 20px;">' +
        '<h3 style="color: #2980b9; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">Career Goal</h3>' +
        '<p>' + (data.careerGoal || '') + '</p>' +
      '</section>' +
      
      '<section style="margin-bottom: 20px;">' +
        '<h3 style="color: #2980b9; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">Work Experience</h3>' +
        '<div>' + (data.workExperience ? data.workExperience.replace(/\n/g, '<br>') : '') + '</div>' +
      '</section>' +
      
      '<section style="margin-bottom: 20px;">' +
        '<h3 style="color: #2980b9; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">Skills</h3>' +
        '<div>' + (data.skills ? data.skills.replace(/\n/g, '<br>') : '') + '</div>' +
      '</section>' +
      
      '<section style="margin-bottom: 20px;">' +
        '<h3 style="color: #2980b9; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">Education</h3>' +
        '<div>' + (data.education ? data.education.replace(/\n/g, '<br>') : '') + '</div>' +
      '</section>';
    
    if (data.projects) {
      resumeHtml += 
        '<section style="margin-bottom: 20px;">' +
          '<h3 style="color: #2980b9; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">Projects</h3>' +
          '<div>' + data.projects.replace(/\n/g, '<br>') + '</div>' +
        '</section>';
    }
    
    resumeHtml += '</div>';
  }
  
  // Complete HTML document
  return '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
      '<meta charset="utf-8">' +
      '<title>' + title + '</title>' +
      '<style>' +
        'body { ' +
          'font-family: \'Helvetica Neue\', Arial, sans-serif; ' +
          'line-height: 1.6; ' +
          'color: #333; ' +
          'margin: 0; ' +
          'padding: 20px;' +
          'background: white;' +
        '}' +
        'h1, h2, h3, h4 { ' +
          'margin-top: 0; ' +
          'margin-bottom: 10px; ' +
        '}' +
        'h3 { ' +
          'font-size: 16px; ' +
          'font-weight: bold; ' +
          'color: #2c3e50;' +
        '}' +
        'p, div { ' +
          'margin: 0 0 10px 0; ' +
        '}' +
        'a { ' +
          'color: #3498db; ' +
          'text-decoration: none; ' +
        '}' +
        'a:hover { ' +
          'text-decoration: underline; ' +
        '}' +
        'header {' +
          'border-bottom: 2px solid #3498db;' +
          'padding-bottom: 15px;' +
          'margin-bottom: 20px;' +
        '}' +
        'section {' +
          'margin-bottom: 20px;' +
        '}' +
        '.section-title {' +
          'color: #2c3e50;' +
          'border-bottom: 1px solid #eee;' +
          'padding-bottom: 5px;' +
          'margin-bottom: 10px;' +
        '}' +
      '</style>' +
    '</head>' +
    '<body>' +
      resumeHtml +
    '</body>' +
    '</html>';
}

/**
 * Migrate localStorage resumes to database
 * POST /api/resumes/migrate
 */
exports.migrateResumes = async (req, res) => {
  try {
    const { resumes } = req.body;
    
    if (!resumes || !Array.isArray(resumes)) {
      return res.status(400).json({
        success: false,
        error: 'Resumes array is required'
      });
    }
    
    let migratedCount = 0;
    const errors = [];
    
    for (const resumeData of resumes) {
      try {
        // Check if a resume with similar content already exists
        const existingResume = await Resume.findOne({
          userId: req.user._id,
          title: resumeData.title,
          'data.fullName': resumeData.data?.fullName
        });
        
        if (!existingResume) {
          // Create new resume in database
          const newResume = new Resume({
            userId: req.user._id,
            title: resumeData.title,
            data: resumeData.data,
            content: resumeData.content || '',
            createdAt: new Date(resumeData.createdAt || Date.now()),
            updatedAt: new Date(resumeData.updatedAt || Date.now())
          });
          
          await newResume.save();
          migratedCount++;
        }
      } catch (error) {
        console.error('Error migrating resume:', error);
        errors.push({
          title: resumeData.title,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      migratedCount,
      errors,
      message: `Successfully migrated ${migratedCount} resumes`
    });
    
  } catch (error) {
    console.error('Error migrating resumes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to migrate resumes'
    });
  }
};
