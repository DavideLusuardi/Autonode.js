const Agent = require('../bdi/Agent')
const Beliefset =  require('../bdi/Beliefset')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Observable =  require('../utils/Observable')
const Clock =  require('../utils/Clock')
const PlanningGoal = require('../pddl/PlanningGoal')
const MessageDispatcher = require('../utils/MessageDispatcher')

const Room = require('./Room')
const Garden = require('./Garden')
const Person = require('./Person')
const {BrightnessSensingGoal, BrightnessSensingIntention} = require('./BrightnessSensing')
const {LightDevice, LightControlGoal, LightControlIntention} = require('./Light')
const {TelevisionDevice, TelevisionControlGoal, TelevisionControlIntention} = require('./Television')
const {ShutterDevice, ShutterControlGoal, ShutterControlIntention} = require('./Shutter')
const {GarageDoorDevice, GarageDoorControlGoal, GarageDoorControlIntention} = require('./GarageDoor')
const Irrigation = require('./Irrigation')
const {SolarPanelDevice, SolarPanelMonitorGoal, SolarPanelMonitorIntention} = require('./SolarPanel')
const {EnergyMonitorGoal, EnergyMonitorIntention} = require('./ResourceMonitor')
const LawnMower = require('./LawnMower')
const VacuumCleaner = require('./VacuumCleaner')

class House {

    constructor () {

        this.utilities = {
            electricity: new Observable( { total_consumption: 0, current_consumption: 0 } ),
            weather: new Observable( {is_raining: false, sun_present: true, last_day_has_rained: -2, raining_next24h: false} ),
        }

        // rooms -------------------------------------------------------
        this.rooms = {
            kitchen: new Room('kitchen', 0, [], true),
            livingroom: new Room('livingroom', 0, [], true),
            garage: new Room('garage', 0, [], true),
            mainbathroom: new Room('mainbathroom', 0, [], true),
            stairs: new Room('stairs', 0, [], true),

            bedroom1: new Room('bedroom1', 1, [], true),
            bedroom2: new Room('bedroom2', 1, [], true),
            bedroom3: new Room('bedroom3', 1, [], true),
            secondarybathroom: new Room('secondarybathroom', 1, [], true),
            corridor: new Room('corridor', 1, [], true),
        }

        let grass_areas = ['a11', 'a12', 'a13', 'a14', 'a15', 'a25', 'a35', 'a43', 'a44', 'a45']
        let connected_areas = ['a11 a12', 'a12 a13', 'a13 a14', 'a14 a15', 'a12 a11', 'a13 a12', 'a14 a13', 'a15 a14', 'a15 a25', 'a25 a15', 'a25 a35', 'a35 a25', 'a35 a45', 'a45 a35', 'a43 a44', 'a44 a45', 'a44 a43', 'a45 a44']
        let grass_height = new Observable(grass_areas.reduce((accumulator, element, index) => { return {...accumulator, [element]: 'tall'} }, {}))
        let ground_slope = {'a11': 'high', 'a12': 'high', 'a13': 'high', 'a14': 'high', 'a15': 'high', 'a25': 'low', 'a35': 'low', 'a43': 'low', 'a44': 'low', 'a45': 'low'}
        this.rooms.garden = new Garden('garden', 0, [], grass_areas, connected_areas, grass_height, ground_slope)

        let doors_to = [
            [this.rooms.livingroom, this.rooms.kitchen],
            [this.rooms.livingroom, this.rooms.mainbathroom],
            [this.rooms.livingroom, this.rooms.garage],
            [this.rooms.livingroom, this.rooms.garden],
            [this.rooms.livingroom, this.rooms.stairs],

            [this.rooms.corridor, this.rooms.bedroom1],
            [this.rooms.corridor, this.rooms.bedroom2],
            [this.rooms.corridor, this.rooms.bedroom3],
            [this.rooms.corridor, this.rooms.secondarybathroom],
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
            luca: new Person.Person(this, 'luca', this.rooms.mainbathroom.name),
        }

        // devices -------------------------------------------------------
        this.devices = {}

        this.lights = {}
        for (let [key, room] of Object.entries(this.rooms)) {
            this.lights['light_'+room.name] = new LightDevice('light_'+room.name, room, 10, this.utilities.electricity)
        }
        // this.devices['lights_stovetop'] = new LightDevice('lights_stovetop', this.rooms.kitchen) // TODO
        this.devices = Object.assign({}, this.devices, this.lights)
        
        this.devices['television'] = new TelevisionDevice('television', this.rooms.livingroom, 50, this.utilities.electricity)
        this.devices['lights_TV'] = new LightDevice('lights_TV', this.rooms.livingroom, 10, this.utilities.electricity)

        let windows_in_rooms = {kitchen:2, livingroom:2, garage:1, mainbathroom:1, garden:1, stairs:1, 
            bedroom1:2, bedroom2:1, bedroom3:1, secondarybathroom:1, corridor:0}
        
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
        this.devices['irrigation_system'] = new Irrigation.IrrigationSystem('irrigation_system', this.rooms.garden)
        this.devices['solar_panels'] = new SolarPanelDevice('solar_panels', this.utilities.electricity)

        this.devices['lawn_mower1'] = new LawnMower.LawnMowerDevice('lawn_mower1', this.rooms.garden, 'a11')
        this.devices['lawn_mower2'] = new LawnMower.LawnMowerDevice('lawn_mower2', this.rooms.garden, 'a45')
        
        this.devices['vacuum_cleaner1'] = new VacuumCleaner.VacuumCleanerDevice('vacuum_cleaner1', this.rooms.livingroom, this.rooms)
        this.devices['vacuum_cleaner2'] = new VacuumCleaner.VacuumCleanerDevice('vacuum_cleaner2', this.rooms.secondarybathroom, this.rooms)
    }

}


class RetryGoal extends Goal {}
class RetryIntention extends Intention {
    static applicable (goal) {
        return goal instanceof RetryGoal
    }
    *exec ({goal}=parameters) {
        for(let i=0; i<10; i++) {
            let goalAchieved = yield this.agent.postSubGoal( goal )
            if (goalAchieved)
                return;
            this.log('wait for something to change on beliefset or timeout before retrying for the ' + (i+2) + 'th time goal', goal.toString())
            // yield this.agent.beliefs.notifyAnyChange()
            yield new Promise( res => {
                this.agent.beliefs.observeAny((value, key, observer) => {res(value)})
                // Clock.global.observe('hh', (hh, key) => {res(hh)})
                setTimeout(()=>{res()}, 1000)
            })
        }
    }
}

var house = new House()
let agents = []

// ------------------------people agents--------------------------------------------------------------------
{
    agents.luca_agent = new Agent('luca_agent', {person: house.people.luca})

    agents.luca_agent.intentions.push(Person.SensingIntention)
    agents.luca_agent.postSubGoal(new Person.SensingGoal(house.people.luca, house.rooms))

    let {PlanningIntention} = require('../pddl/Blackbox')([Person.Move])
    agents.luca_agent.intentions.push(PlanningIntention)
    agents.luca_agent.postSubGoal( new PlanningGoal( { goal: [`in_room ${house.rooms.bedroom1.name}`] } ) )
}

// ------------------------house agent--------------------------------------------------------------------
// agents.house_agent = new Agent('house_agent')

// agents.house_agent.intentions.push(Person.PersonDetectionIntention)
// agents.house_agent.postSubGoal(new Person.PersonDetectionGoal(house.people))

// agents.house_agent.intentions.push(TelevisionControlIntention)
// agents.house_agent.postSubGoal(new TelevisionControlGoal(house.devices.television, house.people, house.devices.lights_TV))

// agents.house_agent.intentions.push(GarageDoorControlIntention)
// agents.house_agent.postSubGoal(new GarageDoorControlGoal([house.devices.garage_door]))

// agents.house_agent.intentions.push(SolarPanelMonitorIntention)
// agents.house_agent.postSubGoal(new SolarPanelMonitorGoal(house.devices.solar_panels))

// agents.house_agent.intentions.push(EnergyMonitorIntention)
// agents.house_agent.postSubGoal(new EnergyMonitorGoal(house.utilities.electricity))

// ------------------------light agent--------------------------------------------------------------------
// agents.light_agent = new Agent('light_agent')

// agents.light_agent.intentions.push(Person.PersonDetectionIntention)
// agents.light_agent.postSubGoal(new Person.PersonDetectionGoal(house.people))

// agents.light_agent.intentions.push(BrightnessSensingIntention)
// agents.light_agent.postSubGoal(new BrightnessSensingGoal(house.rooms))

// agents.light_agent.intentions.push(LightControlIntention)
// agents.light_agent.postSubGoal(new LightControlGoal(house.lights, house.rooms, house.people, house.rooms.garden))


// ------------------------shutter agent--------------------------------------------------------------------
// agents.shutter_agent = new Agent('shutter_agent')

// agents.shutter_agent.intentions.push(ShutterControlIntention)
// agents.shutter_agent.postSubGoal(new ShutterControlGoal(house.shutters))


// ------------------------irrigation agent--------------------------------------------------------------------
// agents.irrigation_agent = new Agent('irrigation_agent')

// agents.irrigation_agent.intentions.push(Irrigation.IrrigationControlIntention)
// agents.irrigation_agent.postSubGoal(new Irrigation.IrrigationControlGoal(house.devices.irrigation_system, house.rooms.garden, house.utilities.weather))


// ------------------------lawn mower agents--------------------------------------------------------------------
// {
//     agents.lawn_mower1 = new Agent('lawn_mower1', {lawn_mower: house.devices.lawn_mower1})

//     agents.lawn_mower1.intentions.push(LawnMower.SensingIntention)
//     agents.lawn_mower1.postSubGoal(new LawnMower.SensingGoal(house.rooms.garden, house.people, house.utilities.weather))

//     let {PlanningIntention} = require('../pddl/Blackbox')([LawnMower.Cut, LawnMower.Move])
//     agents.lawn_mower1.intentions.push(PlanningIntention)
//     agents.lawn_mower1.intentions.push(RetryIntention)

//     let lawn_mower_goal = house.rooms.garden.grass_areas.map(a => { return `not (tall-grass ${a})`} )
//     // agents.lawn_mower1.postSubGoal( new PlanningGoal( { goal: lawn_mower_goal } ) )
//     agents.lawn_mower1.postSubGoal( new RetryGoal( { goal: new PlanningGoal( { goal: lawn_mower_goal } ) } ) )
// }

// {
//     agents.lawn_mower2 = new Agent('lawn_mower2', {lawn_mower: house.devices.lawn_mower2})

//     agents.lawn_mower2.intentions.push(LawnMower.SensingIntention)
//     agents.lawn_mower2.postSubGoal(new LawnMower.SensingGoal(house.rooms.garden, house.people, house.utilities.weather))

//     let {PlanningIntention} = require('../pddl/Blackbox')([LawnMower.Cut, LawnMower.Move])
//     agents.lawn_mower2.intentions.push(PlanningIntention)
//     agents.lawn_mower2.intentions.push(RetryIntention)

//     let lawn_mower_goal = house.rooms.garden.grass_areas.map(a => { return `not (tall-grass ${a})`} )
//     // agents.lawn_mower2.postSubGoal( new PlanningGoal( { goal: lawn_mower_goal } ) )
//     agents.lawn_mower2.postSubGoal( new RetryGoal( { goal: new PlanningGoal( { goal: lawn_mower_goal } ) } ) )
// }

// ------------------------vacuum cleaner agents--------------------------------------------------------------------
// {
//     agents.vacuum_cleaner1 = new Agent('vacuum_cleaner1', {vacuum_cleaner: house.devices.vacuum_cleaner1})
//     let rooms = [house.rooms.livingroom, house.rooms.kitchen, house.rooms.mainbathroom, house.rooms.garage]
    
//     agents.vacuum_cleaner1.intentions.push(VacuumCleaner.SensingIntention)
//     agents.vacuum_cleaner1.postSubGoal(new VacuumCleaner.SensingGoal(rooms, house.people))

//     agents.vacuum_cleaner1.intentions.push(VacuumCleaner.Move, VacuumCleaner.Suck)
//     agents.vacuum_cleaner1.intentions.push(MessageDispatcher.PostmanAcceptAllRequest)

//     let {PlanningIntention} = require('../pddl/Blackbox')([VacuumCleaner.Suck, VacuumCleaner.Move])
//     agents.vacuum_cleaner1.intentions.push(PlanningIntention)
//     // let vacuum_cleaner_goal = rooms.map(r => { return `not (dirty ${r.name})`} ).concat([`at ${house.devices.vacuum_cleaner1.at}`])
//     // agents.vacuum_cleaner1.postSubGoal( new PlanningGoal( { goal: vacuum_cleaner_goal } ) )
    
//     agents.vacuum_cleaner1.postSubGoal( new MessageDispatcher.Postman() )
// }
// {
//     agents.vacuum_cleaner2 = new Agent('vacuum_cleaner2', {vacuum_cleaner: house.devices.vacuum_cleaner2})
//     let rooms = [house.rooms.bedroom1, house.rooms.bedroom2, house.rooms.bedroom3, house.rooms.secondarybathroom, house.rooms.corridor]
    
//     agents.vacuum_cleaner2.intentions.push(VacuumCleaner.SensingIntention)
//     agents.vacuum_cleaner2.postSubGoal(new VacuumCleaner.SensingGoal(rooms, house.people))
    
//     let {PlanningIntention} = require('../pddl/Blackbox')([VacuumCleaner.Suck, VacuumCleaner.Move])
//     agents.vacuum_cleaner2.intentions.push(PlanningIntention)
//     let vacuum_cleaner_goal = rooms.map(r => { return `not (dirty ${r.name})`} ).concat([`at ${house.devices.vacuum_cleaner2.at}`])
//     agents.vacuum_cleaner2.postSubGoal( new PlanningGoal( { goal: vacuum_cleaner_goal } ) )
// }





// Daily schedule
Clock.global.observe('mm', (mm, key) => {
    var time = Clock.global
    // if(time.hh==7 && time.mm==0)
    //     house.people.luca.moveTo(house.rooms.livingroom.name)
    // if(time.hh==8 && time.mm==30)
    //     house.people.luca.moveTo(house.rooms.kitchen.name)
    // if(time.hh==20 && time.mm==0)
    //     house.people.luca.moveTo(house.rooms.livingroom.name)
    // if(time.hh==22 && time.mm==30)
    //     house.people.luca.moveTo(house.rooms.mainbathroom.name)

    if(time.hh==8 && time.mm==0)
        house.devices.solar_panels.activate()
    if(time.hh==18 && time.mm==0)
        house.devices.solar_panels.deactivate()


    // if(time.dd == 1 && time.hh==0 && time.mm==0){ // TODO
    //     let rooms = [house.rooms.livingroom, house.rooms.kitchen, house.rooms.mainbathroom, house.rooms.garage]
    //     let vacuum_cleaner_goal = rooms.map(r => { return `not (dirty ${r.name})`} ).concat([`at ${house.devices.vacuum_cleaner1.at}`])
    //     MessageDispatcher.MessageDispatcher.authenticate(agents.house_agent).sendTo( agents.vacuum_cleaner1.name, new PlanningGoal( { goal: vacuum_cleaner_goal } ) )
    // }
})

Clock.startTimer()



// TODO: implement many intention for the same goal