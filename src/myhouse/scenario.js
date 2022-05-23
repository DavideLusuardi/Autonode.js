const Agent = require('../bdi/Agent')
const Beliefset =  require('../bdi/Beliefset')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Observable =  require('../utils/Observable')
const Clock =  require('../utils/Clock')
const PlanningGoal = require('../pddl/PlanningGoal')

const Room = require('./Room')
const Garden = require('./Garden')
const {Person, PersonDetectionGoal, PersonDetectionIntention} = require('./Person')
const {BrightnessSensingGoal, BrightnessSensingIntention} = require('./BrightnessSensing')
const {LightDevice, LightControlGoal, LightControlIntention} = require('./Light')
const {TelevisionDevice, TelevisionControlGoal, TelevisionControlIntention} = require('./Television')
const {ShutterDevice, ShutterControlGoal, ShutterControlIntention} = require('./Shutter')
const {GarageDoorDevice, GarageDoorControlGoal, GarageDoorControlIntention} = require('./GarageDoor')
const {SolarPanelDevice, SolarPanelMonitorGoal, SolarPanelMonitorIntention} = require('./SolarPanel')
const {EnergyMonitorGoal, EnergyMonitorIntention} = require('./ResourceMonitor')
const LawnMower = require('./LawnMower')
const VacuumCleaner = require('./VacuumCleaner')

class House {

    constructor () {

        this.utilities = {
            electricity: new Observable( { consumption: 0 } ),
            weather: new Observable( {is_raining: false} )
        }

        // rooms -------------------------------------------------------
        this.rooms = {
            kitchen: new Room('kitchen', 0, [], true),
            living_room: new Room('living_room', 0, [], true),
            garage: new Room('garage', 0, [], true),
            main_bathroom: new Room('main_bathroom', 0, [], true),
            stairs: new Room('stairs', 0, [], true),

            bedroom1: new Room('bedroom1', 1, [], true),
            bedroom2: new Room('bedroom2', 1, [], true),
            bedroom3: new Room('bedroom3', 1, [], true),
            secondary_bathroom: new Room('secondary_bathroom', 1, [], true),
            corridor: new Room('corridor', 1, [], true),
        }

        let grass_areas = ['a11', 'a12', 'a13', 'a14', 'a15', 'a25', 'a35', 'a43', 'a44', 'a45']
        let connected_areas = ['a11 a12', 'a12 a13', 'a13 a14', 'a14 a15', 'a12 a11', 'a13 a12', 'a14 a13', 'a15 a14', 'a15 a25', 'a25 a15', 'a25 a35', 'a35 a25', 'a35 a45', 'a45 a35', 'a43 a44', 'a44 a45', 'a44 a43', 'a45 a44']
        let grass_height = new Observable(grass_areas.reduce((accumulator, element, index) => { return {...accumulator, [element]: 'tall'} }, {}))
        this.rooms.garden = new Garden('garden', 0, [], grass_areas, connected_areas, grass_height)

        let doors_to = [
            [this.rooms.living_room, this.rooms.kitchen],
            [this.rooms.living_room, this.rooms.main_bathroom],
            [this.rooms.living_room, this.rooms.garage],
            [this.rooms.living_room, this.rooms.garden],
            [this.rooms.living_room, this.rooms.stairs],

            [this.rooms.corridor, this.rooms.bedroom1],
            [this.rooms.corridor, this.rooms.bedroom2],
            [this.rooms.corridor, this.rooms.bedroom3],
            [this.rooms.corridor, this.rooms.secondary_bathroom],
            [this.rooms.corridor, this.rooms.stairs],
        ]

        doors_to.forEach(pair => {
            let room1 = pair[0]
            let room2 = pair[1]
            room1.doors_to.push(room2.name)
            room2.doors_to.push(room1.name)
        })
        // console.log(this.rooms)

        // TODO: aggiungere altre persone
        // people -------------------------------------------------------
        this.people = {
            // luca: new Person(this, 'luca', this.rooms.main_bathroom.name),
        }

        // devices -------------------------------------------------------
        this.devices = {}

        this.lights = {}
        for (let [key, room] of Object.entries(this.rooms)) {
            this.lights['light_'+room.name] = new LightDevice('light_'+room.name, room, 10, this.utilities.electricity)
        }
        this.devices['lights_TV'] = new LightDevice('lights_TV', this.rooms.living_room, 10, this.utilities.electricity)
        // this.devices['lights_stovetop'] = new LightDevice('lights_stovetop', this.rooms.kitchen) // TODO
        // TODO: implement garden lights
        this.devices = Object.assign({}, this.devices, this.lights)

        this.devices['television'] = new TelevisionDevice('television', this.rooms.living_room, 50, this.utilities.electricity)

        let windows_in_rooms = {kitchen:2, living_room:2, garage:1, main_bathroom:1, garden:1, stairs:1, 
            bedroom1:2, bedroom2:1, bedroom3:1, secondary_bathroom:1, corridor:0}
        
        this.shutters = {}
        for (let [key, num_windows] of Object.entries(windows_in_rooms)){
            this.rooms[key].windows = num_windows
            for(let i=0; i<num_windows; i++){
                let shutter_name = 'shutter'+(num_windows>1?(i+1):'')+'_'+key                
                this.shutters[shutter_name] = new ShutterDevice(shutter_name, this.rooms[key])
            }
        }
        this.devices = Object.assign({}, this.devices, this.shutters)

        this.devices['garage_door'] = new GarageDoorDevice('garage_door', this.rooms.garage)
        this.devices['solar_panels'] = new SolarPanelDevice('solar_panels', this.utilities.electricity)

        this.devices['lawn_mower'] = new LawnMower.LawnMowerDevice('lawn_mower', this.rooms.garden)
        this.devices['vacuum_cleaner'] = new VacuumCleaner.VacuumCleanerDevice('vacuum_cleaner', this.rooms.living_room)
    }

}


// class HouseAgent extends Agent {
//     constructor (name, agents={}, devices={}) {
//         super(name, agents, devices)

//         this.actions = {}
//     }

//     turnOnLight(light_name){
//         for(let [d_name, d] of Object.entries(devices)){
//             if(d.name == light_name){
//                 this.intentions.push(TODO)
//             }
//         }
//     }
// }


var house = new House()
let agents = []

// ------------------------house agent--------------------------------------------------------------------
agents.house_agent = new Agent('house_agent')

// agents.house_agent.intentions.push(PersonDetectionIntention)
// agents.house_agent.postSubGoal(new PersonDetectionGoal(house.people))

// agents.house_agent.intentions.push(BrightnessSensingIntention)
// agents.house_agent.postSubGoal(new BrightnessSensingGoal(house.rooms))

// agents.house_agent.intentions.push(LightControlIntention)
// agents.house_agent.postSubGoal(new LightControlGoal(house.lights, house.rooms, house.people))

// agents.house_agent.intentions.push(TelevisionControlIntention)
// agents.house_agent.postSubGoal(new TelevisionControlGoal(house.devices.television, house.people, house.devices.lights_TV))

// agents.house_agent.intentions.push(ShutterControlIntention)
// agents.house_agent.postSubGoal(new ShutterControlGoal(house.shutters))

// agents.house_agent.intentions.push(GarageDoorControlIntention)
// agents.house_agent.postSubGoal(new GarageDoorControlGoal([house.devices.garage_door]))

// agents.house_agent.intentions.push(SolarPanelMonitorIntention)
// agents.house_agent.postSubGoal(new SolarPanelMonitorGoal(house.devices.solar_panels))

// agents.house_agent.intentions.push(EnergyMonitorIntention)
// agents.house_agent.postSubGoal(new EnergyMonitorGoal(house.utilities.electricity))


// ------------------------lawn mower agent--------------------------------------------------------------------
// agents.lawn_mower = new Agent('lawn_mower', agents, house.devices)

// agents.lawn_mower.intentions.push(LawnMower.SensingIntention)
// agents.lawn_mower.postSubGoal(new LawnMower.SensingGoal(house.rooms.garden, house.people, house.utilities.weather))

// let {LawnMowerPlanningIntention} = require('../pddl/Blackbox')([LawnMower.Cut, LawnMower.Move])
// agents.lawn_mower.intentions.push(LawnMowerPlanningIntention)
// let lawn_mower_goal = locations.map(a => { return `not (tall-grass ${a})`} )
// agents.lawn_mower.postSubGoal( new PlanningGoal( { goal: lawn_mower_goal } ) )


// ------------------------vacuum cleaner agent--------------------------------------------------------------------
agents.vacuum_cleaner = new Agent('vacuum_cleaner', agents, house.devices)
let rooms = [house.rooms.living_room, house.rooms.kitchen, house.rooms.main_bathroom, house.rooms.garage]

agents.vacuum_cleaner.intentions.push(VacuumCleaner.SensingIntention)
agents.vacuum_cleaner.postSubGoal(new VacuumCleaner.SensingGoal(rooms, house.people))

let {PlanningIntention} = require('../pddl/Blackbox')([VacuumCleaner.Suck, VacuumCleaner.Move])
agents.vacuum_cleaner.intentions.push(PlanningIntention)
let vacuum_cleaner_goal = rooms.map(r => { return `not (dirty ${r.name})`} ).concat([`at ${house.devices.vacuum_cleaner.at.name}`])
agents.vacuum_cleaner.postSubGoal( new PlanningGoal( { goal: vacuum_cleaner_goal } ) )




// Daily schedule
Clock.global.observe('mm', (mm, key) => {
    var time = Clock.global
    // if(time.hh==7 && time.mm==0)
    //     house.people.luca.moveTo(house.rooms.living_room.name)
    // if(time.hh==8 && time.mm==30)
    //     house.people.luca.moveTo(house.rooms.kitchen.name)
    // if(time.hh==20 && time.mm==0)
    //     house.people.luca.moveTo(house.rooms.living_room.name)
    // if(time.hh==23 && time.mm==0)
    //     house.people.luca.moveTo(house.rooms.main_bathroom.name)

    if(time.hh==8 && time.mm==0)
        house.devices.solar_panels.activate()
    if(time.hh==18 && time.mm==0)
        house.devices.solar_panels.deactivate()
})

Clock.startTimer()



// TODO: pddlActionIntention get arguments of action
// TODO: implement perform of agent
// TODO: implement many intention for the same goal

// more agents with same goal but different intentions
// sensors as observable or intentions
// washing machine behaves different accorgingly to initial setting and status