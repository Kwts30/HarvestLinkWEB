import mongoose from 'mongoose';

export default function connect(){
    const database = "mongodb+srv://jarylbenedicto:xwtLFrErYn0tLNVG@kwts.pk1afoq.mongodb.net/?retryWrites=true&w=majority&appName=Kwts";
    mongoose
        .connect(database)
        .then(() => {
            console.log("Connected to Database");
        })
        .catch((error) => {
            console.error(error);
        });
            

}