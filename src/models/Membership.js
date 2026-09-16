import mongoose from 'mongoose';
const membershipSchema=new mongoose.Schema({
  fullName:{type:String,required:true,trim:true,maxLength:120},designation:{type:String,required:true,trim:true,maxLength:120},institution:{type:String,required:true,trim:true,maxLength:180},country:{type:String,required:true,trim:true,maxLength:80},nationality:{type:String,required:true,trim:true,maxLength:80},dateOfBirth:{type:Date,required:true},gender:{type:String,required:true,enum:['Female','Male','Non-binary','Prefer not to say']},email:{type:String,required:true,trim:true,lowercase:true,match:/^\S+@\S+\.\S+$/},phone:{type:String,required:true,trim:true,maxLength:40},address:{type:String,required:true,trim:true,maxLength:400},profilePicture:{type:String,required:true},cv:{type:String,required:true},interests:{type:[String],required:true,validate:v=>v.length>0},contribution:{type:String,required:true,trim:true,maxLength:1200},status:{type:String,enum:['pending','reviewing','approved','declined'],default:'pending'}
},{timestamps:true});
membershipSchema.index({email:1},{unique:true,collation:{locale:'en',strength:2}});
membershipSchema.index({status:1,createdAt:-1});
export default mongoose.model('Membership',membershipSchema);
