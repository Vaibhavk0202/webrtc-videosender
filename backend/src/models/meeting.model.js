import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    meetingCode: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

export const Meeting = mongoose.model("Meeting", meetingSchema);
