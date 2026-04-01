// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: brown; icon-glyph: magic;
// Question
async function question(title, textfield) {
   let alert = new Alert()
   alert.title = title
   alert.addTextField(textfield)
   alert.addAction("Submit")
   alert.addCancelAction("Cancel")
   let response = await alert.present()
   if (response === -1) {
      Script.complete()
      throw "User Exited the Program."
   }
   return alert.textFieldValue(0);
}

// defines price
let price = 0

// Asks species
let pet_species = await question("Pet Species", "Dog/Cat/Lizard")

let pet_name = await question("Pet Name","John")

while (true) {
   if (pet_species.toLowerCase() === "dog") {
      const dog_size = await question("Dog Size", "Large/Medium/Small")
      if (dog_size.toLowerCase() === "small") {
         price = 5
         break
      }
      else if (dog_size.toLowerCase() === "medium") {
         price = 10
         break
      }
      else if (dog_size.toLowerCase() === "large") {
         price = 15
         break
      }
      else {
         let alert = new Alert()
         alert.title = "Supported sizes are small, medium, or large"
         alert.addAction("Okay")
         await alert.present()
      }
   }
   else if (pet_species.toLowerCase() === "cat") {
      const cat_age = await question("Cat Age", "3")
      if (parseInt(cat_age) <= 3) {
         price = 5
         break
      }
      else if (parseInt(cat_age) <= 7) {
         price = 10
         break
      }
      else if (parseInt(cat_age) >= 8) {
         price = 15
         break
      }
      else {
         let alert = new Alert()
         alert.title = "Please enter an integer in years"
         alert.addAction("Okay")
         await alert.present()
      }
   }
   else if (pet_species.toLowerCase() === "lizard") {
      const lizard_species = await question("Lizard Species", "Gecko, Bearded Dragon, or Blue Tounge")
      if (lizard_species.toLowerCase() === "gecko") {
         price = 5
         break
      }
      else if (lizard_species.toLowerCase() === "bearded dragon") {
         price = 10
         break
      }
      else if (lizard_species.toLowerCase() === "blue tounge") {
         price = 15
         break
      }
      else {
         let alert = new Alert()
         alert.title = "Please enter gecko, bearded dragon or blue tounge. We do not wash other lizards"
         alert.addAction("Okay")
         await alert.present()
      }
   }
}

while (true) {
      if (pet_species.toLowerCase() === "cat" || pet_species.toLowerCase() === "lizard") {
         const pickup = await question("Do you need our team to pick up & drop off " + pet_name + "?", "Yes")
         if (pickup.toLowerCase() == "yes") {
            price = price + 15
            break
         }
         else if (pickup.toLowerCase() === "no") {
            break
         }
         else {
            let alert = new Alert()
            alert.title = "Please enter yes or no."
            alert.addAction("Okay")
            await alert.present()
         }
     }
     else if (pet_species.toLowerCase() === "dog") {
         const last_washing = await question("How many months ago did you wash your dog?", "8")
         if (parseInt(last_washing) >= 6) {
            price = price * 1.5
            break
         }
         else if ((parseInt(last_washing) < 6)) {
            price = price
            break
         }
         else {
            let alert = new Alert()
            alert.title = "Please enter an integer for months."
            alert.addAction("Okay")
            await alert.present()
         }
      }
}

let washing_date = await question("What date would work best for " + pet_name + "s washing", "Next Wednesday")

let alert = new Alert()
alert.title = "Booking Successful"
alert.message = `Pet: ${pet_species} (${pet_name})
Date: ${washing_date}
Price: $${price}
Thank you for booking!`
alert.addAction("Thank you!")
await alert.present()

Script.complete()