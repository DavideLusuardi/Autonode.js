const Beliefset =  require('../bdi/Beliefset')
const Observable =  require('../utils/Observable')
const Clock =  require('../utils/Clock')
const Agent = require('../bdi/Agent')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const {Person, PersonDetectionGoal, PersonDetectionIntention} = require('./Person')
const {BrightnessSensingGoal, BrightnessSensingIntention} = require('./BrightnessSensing')
const {LightDevice, LightControlGoal, LightControlIntention} = require('./Light')
const {TelevisionDevice, TelevisionControlGoal, TelevisionControlIntention} = require('./Television')
const {ShutterDevice, ShutterControlGoal, ShutterControlIntention} = require('./Shutter')
const {GarageDoorDevice, GarageDoorControlGoal, GarageDoorControlIntention} = require('./GarageDoor')
const {SolarPanelDevice, SolarPanelMonitorGoal, SolarPanelMonitorIntention} = require('./SolarPanel')
const {EnergyMonitorGoal, EnergyMonitorIntention} = require('./ResourceMonitor')

class House {

    constructor () {

        this.utilities = {
            electricity: new Observable( { consumption: 0 } )
        }

        // rooms -------------------------------------------------------
        this.rooms = {
            kitchen: { name: 'kitchen', floor: 0, doors_to:[]},
            living_room: { name: 'living_room', floor: 0, doors_to:[]},
            garage: { name: 'garage', floor: 0, doors_to:[]},
            main_bathroom: { name: 'main_bathroom', floor: 0, doors_to:[]},
            garden: { name: 'garden', floor: 0, doors_to:[]},
            stairs_up: { name: 'stairs_up', floor: 0, doors_to:[]},

            bedroom1: { name: 'bedroom1', floor: 1, doors_to:[]},
            bedroom2: { name: 'bedroom2', floor: 1, doors_to:[]},
            bedroom3: { name: 'bedroom3', floor: 1, doors_to:[]},
            secondary_bathroom: { name: 'secondary_bathroom', floor: 1, doors_to:[]},
            stairs_down: { name: 'stairs_down', floor: 1, doors_to:[]},
            corridor: { name: 'corridor', floor: 1, doors_to:[]},
        }

        let doors_to = [
            [this.rooms.living_room, this.rooms.kitchen],
            [this.rooms.living_room, this.rooms.main_bathroom],
            [this.rooms.living_room, this.rooms.garage],
            [this.rooms.living_room, this.rooms.garden],
            [this.rooms.living_room, this.rooms.stairs_up],

            [this.rooms.corridor, this.rooms.bedroom1],
            [this.rooms.corridor, this.rooms.bedroom2],
            [this.rooms.corridor, this.rooms.bedroom3],
            [this.rooms.corridor, this.rooms.secondary_bathroom],
            [this.rooms.corridor, this.rooms.stairs_down],
        ]

        doors_to.forEach(pair => {
            let room1 = pair[0]
            let room2 = pair[1]
            room1.doors_to.push(room2.name)
            room2.doors_to.push(room1.name)
        })
        // console.log(this.rooms)

        // people -------------------------------------------------------
        this.people = {
            luca: new Person(this, 'luca', this.rooms.living_room.name),
        }

        // devices -------------------------------------------------------
        this.devices = {}

        this.lights = {}
        for (let [key, room] of Object.entries(this.rooms)) {
            this.lights['light_'+room.name] = new LightDevice('light_'+room.name, room, 10, this.utilities.electricity)
        }
        this.devices['lights_TV'] = new LightDevice('lights_TV', this.rooms.living_room, 10, this.utilities.electricity)
        // this.devices['lights_stovetop'] = new LightDevice('lights_stovetop', this.rooms.kitchen) // TODO
        this.devices = Object.assign({}, this.devices, this.lights)

        this.devices['television'] = new TelevisionDevice('television', this.rooms.living_room, 50, this.utilities.electricity)

        let windows_in_rooms = {kitchen:2, living_room:2, garage:1, main_bathroom:1, garden:1, stairs_up:1, 
            bedroom1:2, bedroom2:1, bedroom3:1, secondary_bathroom:1, stairs_down:1, corridor:0}
        
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
    }

}


var house = new House()

let agents = []
agents.house_agent = new Agent('house_agent')

agents.house_agent.intentions.push(PersonDetectionIntention)
agents.house_agent.postSubGoal(new PersonDetectionGoal(house.people))

agents.house_agent.intentions.push(BrightnessSensingIntention)
agents.house_agent.postSubGoal(new BrightnessSensingGoal(house.rooms))

agents.house_agent.intentions.push(LightControlIntention)
agents.house_agent.postSubGoal(new LightControlGoal(house.lights, house.rooms, house.people))

agents.house_agent.intentions.push(TelevisionControlIntention)
agents.house_agent.postSubGoal(new TelevisionControlGoal(house.devices.television, house.people, house.devices.lights_TV))

agents.house_agent.intentions.push(ShutterControlIntention)
agents.house_agent.postSubGoal(new ShutterControlGoal(house.shutters))

agents.house_agent.intentions.push(GarageDoorControlIntention)
agents.house_agent.postSubGoal(new GarageDoorControlGoal([house.devices.garage_door]))

agents.house_agent.intentions.push(SolarPanelMonitorIntention)
agents.house_agent.postSubGoal(new SolarPanelMonitorGoal(house.devices.solar_panels))

agents.house_agent.intentions.push(EnergyMonitorIntention)
agents.house_agent.postSubGoal(new EnergyMonitorGoal(house.utilities.electricity))


// Daily schedule
Clock.global.observe('mm', (mm, key) => {
    var time = Clock.global
    if(time.hh==1 && time.mm==0)
        house.people.luca.moveTo(house.rooms.kitchen.name)            
    if(time.hh==7 && time.mm==0)
        house.people.luca.moveTo(house.rooms.living_room.name)
    if(time.hh==8 && time.mm==30)
        house.people.luca.moveTo(house.rooms.kitchen.name)
    if(time.hh==20 && time.mm==0)
        house.people.luca.moveTo(house.rooms.living_room.name)
    if(time.hh==23 && time.mm==0){
        house.people.luca.moveTo(house.rooms.stairs_up.name)
        house.people.luca.moveTo(house.rooms.stairs_down.name)
        house.people.luca.moveTo(house.rooms.corridor.name)
        house.people.luca.moveTo(house.rooms.bedroom1.name)
    }

    if(time.hh==8 && time.mm==0)
        house.devices.solar_panels.activate()
    if(time.hh==18 && time.mm==0)
        house.devices.solar_panels.deactivate()
})

Clock.startTimer()