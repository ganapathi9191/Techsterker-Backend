const mongoose = require("mongoose");

const HeroBannerSchema = new mongoose.Schema({
  image: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true }
});

const HomeScreenSchema = new mongoose.Schema({
  heroBanner: {
    type: [HeroBannerSchema],
    default: []
  }
}, { timestamps: true });


// ✅ Feature Schema
const featureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  }
});
// ✅ Home Feature Schema
const homeFeatureSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  features: [featureSchema]
}, { timestamps: true });


//Home client
const ContentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  image: [
    {
      type: String,
      required: true,
    }
  ]
}, { timestamps: true });

// ✅ Review Schema (renamed from Rating)
const reviewSchema = new mongoose.Schema(
  {
    image: { type: String },
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    content: { type: String },
  },
  { timestamps: true }
);


//client
const CounterItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  count: { type: Number, required: true, default: 0 }
});

const CounterSchema = new mongoose.Schema({
  counters: { type: [CounterItemSchema], default: [] }
}, { timestamps: true });



const DefferItemSchema = new mongoose.Schema({
  image: { type: String, required: true },
  content: { type: String ,required: false},
});

const HomeDefferschemsSchema = new mongoose.Schema({
  mainImage: { type: String, required: true }, // single separate image
  deffer: {
    type: [DefferItemSchema], // array of image+content items
    default: []
  }
}, { timestamps: true });


// HomeCourses Schema
const homeCoursesSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
});



const Counter = mongoose.model("Counter", CounterSchema);
const Review = mongoose.model("Review", reviewSchema);
const HomeFeature = mongoose.model('HomeFeature', homeFeatureSchema);
const HomeScreen = mongoose.model("HomeScreen", HomeScreenSchema);
const Client = mongoose.model('Client', ContentSchema);
const HomeDefferschems = mongoose.model("HomeDefferschems", HomeDefferschemsSchema);
const HomeCourses = mongoose.model("HomeCourses", homeCoursesSchema);




// ✅ Export both
module.exports = { HomeScreen, HomeFeature,Client,Review,Counter,HomeDefferschems,HomeCourses };
