const doNotSendPhotographers = {
    "Tony Scott": ["JMO", "JMO PROPERTY GROUP", "JMO Property Group Group", "Taleesha", "Taleesha Kelly", "Jennifer Oliver", "Jo Dryden", "Michelle Osmond", "Sam Ware", "Rebekah Ware", "Teza Fruzande", "Tammie Cory Jones", "Naveep Singh", "Belinda Beekman"],
    "Jocelyn Bong": ["JMO", "JMO PROPERTY GROUP", "JMO Property Group Group", "Taleesha", "Taleesha Kelly", "Jennifer Oliver", "Jo Dryden", "Michelle Osmond", "Peter Florentzos", "Alex Fan", "Nick Yamada", "Mary Chai", "Alan Gu", "Shirley Chow", "Sienna Kim", "Jackson Chow", "Pragya Ojha", "Faraz Peyman", "Ana Wang", "Kosmo Comino", "Sergio Chen", "Hanna Shine", "Rachael Lancaster", "Michael O’Brien", "Jack McKenzie", "Casey Brigland", "Louise Denisenko", "Naveep Singh", "Belinda Beekman", "Vivienne Cheah", "Ramin Bay"],
    "Catalina Araya": ["Belinda Beekman", "Naveep Singh"],
    "Kirk Halstead": ["Nick Yamada", "Mary Chai", "JMO", "JMO PROPERTY GROUP", "JMO Property Group Group", "Taleesha", "Taleesha Kelly", "Jennifer Oliver", "Jo Dryden", "Michelle Osmond", "Belinda Beekman"],
    "April O’Neil": ["Sharon DesPasquale", "JMO", "JMO PROPERTY GROUP", "JMO Property Group Group", "Taleesha", "Taleesha Kelly", "Jennifer Oliver", "Jo Dryden", "Michelle Osmond", "Gus Yoshida", "Kristy Milford", "Lizzie Basford", "Naveep Singh", "Belinda Beekman"],
    "Andreja Mitivoik": ["JMO", "JMO PROPERTY GROUP", "JMO Property Group Group", "Taleesha", "Taleesha Kelly", "Jennifer Oliver", "Jo Dryden", "Michelle Osmond", "Belinda Beekman"],
    "Chi Cantrell": ["JMO", "JMO PROPERTY GROUP", "JMO Property Group Group", "Taleesha", "Taleesha Kelly", "Jennifer Oliver", "Jo Dryden", "Michelle Osmond", "Naveep Singh", "Belinda Beekman"]
};

const allowedPhotographers = [
    'andreja.thepicketfence@gmail.com',
    'jake.thepicketfence@gmail.com',
    'marcelo.thepicketfence@gmail.com'
];

const droneServices = [
    'Aerial Photography',
    'Videography',
    'Panoramic Drone'
];

const cityDroneServices = [
    'Aerial Photography',
    'Videography',
];

// const geoShape = {
//     "Mini drone": ["Mini Drone 1", "Mini Drone 2", "Mini Drone 3", "Mini Drone 4", "Mini Drone 5", "Mini Drone 6", "Mini Drone 7", "Mini Drone 8", "Mini Drone 9", "Mini Drone 9"],
//     "Splays Never": ["Splay 1"],
//     "Splays Never1": ["Splay 4", "Splay 3", "Splay 5"],
//     "Splays After 5pm": ["Splay 8", "Splay 10", "Splay 11", "Splay 9"],
//     "Splay before 6:00am": ["Splay 7", "Splay 2", "Splay 6"],
//     "Unlocking Licence": ["Unlocking Licence 1", "Unlocking Licence 2", "Unlocking Licence 3", "Unlocking Licence 4"]
// };
const geoShape = {
    "Mini drone": ["Mini Drone 1", "Mini Drone 2", "Mini Drone 3", "Mini Drone 4", "Mini Drone 5", "Mini Drone 9", "Mini Drone 9"],
    "Splays Never": ["Splay 1"],
    // "Splays Never1": ["Splay 4", "Splay 3", "Splay 5"],
    "Splays After 5pm": ["Splay 8", "Splay 10", "Splay 11", "Splay 9"],
    "Splay before 6:00am": ["Splay 7", "Splay 2", "Splay 6"],
    "Unlocking Licence": ["Unlocking Licence 1", "Unlocking Licence 2", "Unlocking Licence 4"]
};

module.exports = { doNotSendPhotographers, allowedPhotographers, droneServices, cityDroneServices, geoShape };
