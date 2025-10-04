const CourseModule = require("../models/courseModuleSchema");
const { Enrollment } = require("../models/enrollment"); 
const { uploadImage } = require("../config/cloudinary1");
const axios = require("axios");

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

async function fetchVideoDuration(videoId) {
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${YT_API_KEY}`;
    const res = await axios.get(url);
    if (res.data.items.length > 0) {
      return res.data.items[0].contentDetails.duration; // ISO 8601
    }
    return null;
  } catch (err) {
    console.error("Error fetching video duration:", err.message);
    return null;
  }
}

exports.createCourseModule = async (req, res) => {
  try {
    const { enrolledId } = req.body;

    // 1. Fetch enrollment with course and assigned mentors populated
    const enrollment = await Enrollment.findById(enrolledId)
      .populate("courseId", "courseName")
      .populate("assignedMentors", "firstName lastName");

    if (!enrollment) {
      return res.status(404).json({ success: false, message: "Enrollment not found" });
    }
    
    if (!enrollment.courseId) {
      return res.status(404).json({ success: false, message: "Course not linked to enrollment" });
    }
    
    // Check if there are assigned mentors
    if (!enrollment.assignedMentors || enrollment.assignedMentors.length === 0) {
      return res.status(404).json({ success: false, message: "No mentors assigned to this enrollment" });
    }

    // Use the first assigned mentor (or you might need to modify this logic based on your requirements)
    const primaryMentor = enrollment.assignedMentors[0];

    // 2. Parse module data from request
    const data = JSON.parse(req.body.data);

    // 3. Attach YouTube durations and upload resources
    let fileIndex = 0;
    for (const module of data.modules) {
      for (const topic of module.topics) {
        for (const lesson of topic.lessons) {
          if (lesson.videoId) {
            lesson.duration = await fetchVideoDuration(lesson.videoId);
          }
          for (const resource of lesson.resources) {
            if (req.files && req.files[fileIndex]) {
              const fileBuffer = req.files[fileIndex].buffer;
              const fileName = req.files[fileIndex].originalname;
              const cloudUrl = await uploadImage(fileBuffer, "course-resources", fileName);
              resource.file = cloudUrl;
              fileIndex++;
            }
          }
        }
      }
    }

    // 4. Create new module record
    const newModule = await CourseModule.create({
      enrolledId,
      courseId: enrollment.courseId._id,
      courseName: enrollment.courseId.courseName,
      mentorId: primaryMentor._id,
      mentorName: `${primaryMentor.firstName} ${primaryMentor.lastName}`,
      modules: data.modules
    });

    res.status(201).json({
      success: true,
      message: "Course module created",
      data: newModule
    });

  } catch (error) {
    console.error("Error in createCourseModule:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};



// Get all course modules
exports.getAllCourseModules = async (req, res) => {
  try {
    const courseModules = await CourseModule.find()
      .populate("enrolledId") // enrolled users
      .populate({
        path: "courseId",   // course populate
        select: "name description duration category" // jo fields dikhani hain
      })
      .populate({
        path: "mentorId",   // mentor populate
        select: "firstName lastName email phoneNumber expertise" // mentor ki fields
      });

    res.status(200).json({
      success: true,
      message: "All course modules retrieved successfully",
      data: courseModules,
      count: courseModules.length
    });
  } catch (error) {
    console.error("Error in getAllCourseModules:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get course module by ID
exports.getCourseModuleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const courseModule = await CourseModule.findById(id)
      .populate("enrolledId")
    
    
    if (!courseModule) {
      return res.status(404).json({
        success: false,
        message: "Course module not found"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Course module retrieved successfully",
      data: courseModule
    });
  } catch (error) {
    console.error("Error in getCourseModuleById:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get course modules by enrolledId
exports.getCourseModulesByEnrolledId = async (req, res) => {
  try {
    const { enrolledId } = req.params;
    
    const courseModules = await CourseModule.find({ enrolledId })
      .populate("enrolledId")
     
    
    if (!courseModules || courseModules.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No course modules found for this enrollment"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Course modules retrieved successfully",
      data: courseModules,
      count: courseModules.length
    });
  } catch (error) {
    console.error("Error in getCourseModulesByEnrolledId:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get course modules by userId (through enrollment)
exports.getCourseModulesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // First find enrollments for this user
    const enrollments = await Enrollment.find({ 
      enrolledUsers: userId 
    });
    
    if (!enrollments || enrollments.length === 0) {
      return res.status(404).json({
        success:true,
        message: []
      });
    }
    
    // Extract enrollment IDs
    const enrollmentIds = enrollments.map(enrollment => enrollment._id);
    
    // Find course modules for these enrollments
    const courseModules = await CourseModule.find({ 
      enrolledId: { $in: enrollmentIds } 
    })
      .populate("enrolledId")
 
    
    if (!courseModules || courseModules.length === 0) {
      return res.status(404).json({
        success: true,
        message:[]
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Course modules retrieved successfully",
      data: courseModules,
      count: courseModules.length
    });
  } catch (error) {
    console.error("Error in getCourseModulesByUserId:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Update course module by ID
exports.updateCourseModuleById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Check if the course module exists
    const existingModule = await CourseModule.findById(id);
    if (!existingModule) {
      return res.status(404).json({
        success: false,
        message: "Course module not found"
      });
    }
    
    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      // This part would need to be customized based on your specific update requirements
      // For now, we'll just proceed with the basic update
    }
    
    // Update the course module
    const updatedModule = await CourseModule.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("enrolledId")
     
    
    res.status(200).json({
      success: true,
      message: "Course module updated successfully",
      data: updatedModule
    });
  } catch (error) {
    console.error("Error in updateCourseModuleById:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Update a specific lesson in a course module
exports.updateLessonInModule = async (req, res) => {
  try {
    const { moduleId, topicIndex, lessonIndex } = req.params;
    const updateData = req.body;
    
    const courseModule = await CourseModule.findById(moduleId);
    if (!courseModule) {
      return res.status(404).json({
        success: false,
        message: "Course module not found"
      });
    }
    
    // Update the specific lesson
    courseModule.modules.forEach(module => {
      module.topics[topicIndex].lessons[lessonIndex] = {
        ...module.topics[topicIndex].lessons[lessonIndex].toObject(),
        ...updateData
      };
    });
    
    const updatedModule = await courseModule.save();
    
    res.status(200).json({
      success: true,
      message: "Lesson updated successfully",
      data: updatedModule
    });
  } catch (error) {
    console.error("Error in updateLessonInModule:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Delete course module by ID
exports.deleteCourseModuleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the course module exists
    const courseModule = await CourseModule.findById(id);
    if (!courseModule) {
      return res.status(404).json({
        success: false,
        message: "Course module not found"
      });
    }
    
    // Delete the course module
    await CourseModule.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: "Course module deleted successfully"
    });
  } catch (error) {
    console.error("Error in deleteCourseModuleById:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};