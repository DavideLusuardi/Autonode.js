const Agent = require('../bdi/Agent')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')
const PlanningGoal = require('../pddl/PlanningGoal')

const Room = require('./Room')
const Person = require('./Person')
const BrightnessSensing = require('./BrightnessSensing')
const Light = require('./Light')
const Television = require('./Television')
const Shutter = require('./Shutter')
const GarageDoor = require('./GarageDoor')
const Irrigation = require('./Irrigation')
const SolarPanel = require('./SolarPanel')
const ResourceMonitor = require('./ResourceMonitor')
const LawnMower = require('./LawnMower')
const VacuumCleaner = require('./VacuumCleaner')
const MessageDispatcher = require('./MessageDispatcher')
const House = require('./House')


class RetryGoal extends Goal { }
class RetryIntention extends Intention {
    static applicable(goal) {
        return goal instanceof RetryGoal
    }
    *exec({ goal } = parameters) {
        for (let i = 0; i < 10; i++) {
            let goalAchieved = yield this.agent.postSubGoal(goal)
            if (goalAchieved)
                return;
            this.log('wait for something to change on beliefset or timeout before retrying for the ' + (i + 2) + 'th time goal', goal.toString())
            // yield this.agent.beliefs.notifyAnyChange()
            yield new Promise(res => {
                this.agent.beliefs.observeAny((value, key, observer) => { res(value) })
                // Clock.global.observe('hh', (hh, key) => {res(hh)})
                setTimeout(() => { res() }, 100)
            })
        }
    }
}

var house = new House.House()
let agents = []

// ------------------------people agents--------------------------------------------------------------------
{
    agents.luca_agent = new Agent('luca_agent', { person: house.people.luca })

    agents.luca_agent.intentions.push(Room.RoomConnectionIntention)
    agents.luca_agent.postSubGoal(new Room.RoomConnectionGoal(Object.values(house.rooms)))

    agents.luca_agent.intentions.push(Person.PersonDetectionIntention)
    agents.luca_agent.postSubGoal(new Person.PersonDetectionGoal({luca: house.people.luca}))

    let { PlanningIntention } = require('../pddl/Blackbox')([Person.Move])
    agents.luca_agent.intentions.push(PlanningIntention)
}

// ------------------------house agent--------------------------------------------------------------------
agents.house_agent = new Agent('house_agent')

agents.house_agent.intentions.push(Person.SomeoneInRoomDetectionIntention)
agents.house_agent.postSubGoal(new Person.SomeoneInRoomDetectionGoal(house.people, [house.devices.television.room]))

agents.house_agent.intentions.push(Television.TelevisionSensingIntention)
agents.house_agent.postSubGoal(new Television.TelevisionSensingGoal(house.devices.television))

agents.house_agent.intentions.push(Television.TelevisionControlIntention)
agents.house_agent.postSubGoal(new Television.TelevisionControlGoal(house.devices.television, house.devices.lights_TV))

agents.house_agent.intentions.push(GarageDoor.GarageDoorSensingIntention)
agents.house_agent.postSubGoal(new GarageDoor.GarageDoorSensingGoal([house.devices.garage_door]))

agents.house_agent.intentions.push(GarageDoor.GarageDoorControlIntention)
agents.house_agent.postSubGoal(new GarageDoor.GarageDoorControlGoal([house.devices.garage_door]))

agents.house_agent.intentions.push(SolarPanel.SolarPanelMonitorIntention)
agents.house_agent.postSubGoal(new SolarPanel.SolarPanelMonitorGoal(house.devices.solar_panels))

agents.house_agent.intentions.push(ResourceMonitor.EnergyMonitorIntention)
agents.house_agent.postSubGoal(new ResourceMonitor.EnergyMonitorGoal(house.utilities.electricity))

// ------------------------light agent--------------------------------------------------------------------
agents.light_agent = new Agent('light_agent')

agents.light_agent.intentions.push(Person.PersonDetectionIntention)
agents.light_agent.postSubGoal(new Person.PersonDetectionGoal(house.people))

agents.light_agent.intentions.push(Person.SleepingSensingIntention)
agents.light_agent.postSubGoal(new Person.SleepingSensingGoal(house.people))

agents.light_agent.intentions.push(BrightnessSensing.BrightnessSensingIntention)
agents.light_agent.postSubGoal(new BrightnessSensing.BrightnessSensingGoal(house.rooms))

agents.light_agent.intentions.push(Light.LightSensingIntention)
agents.light_agent.postSubGoal(new Light.LightSensingGoal(house.lights))

agents.light_agent.intentions.push(Light.LightControlIntention)
agents.light_agent.postSubGoal(new Light.LightControlGoal(house.lights, house.people, house.rooms.garden))


// ------------------------shutter agent--------------------------------------------------------------------
agents.shutter_agent = new Agent('shutter_agent')

agents.shutter_agent.intentions.push(Shutter.ShutterSensingIntention)
agents.shutter_agent.postSubGoal(new Shutter.ShutterSensingGoal(house.shutters))

agents.shutter_agent.intentions.push(Shutter.ShutterControlIntention)
agents.shutter_agent.postSubGoal(new Shutter.ShutterControlGoal(house.shutters))


// ------------------------irrigation agent--------------------------------------------------------------------
agents.irrigation_agent = new Agent('irrigation_agent')

agents.irrigation_agent.intentions.push(Irrigation.IrrigationSensingIntention)
agents.irrigation_agent.postSubGoal(new Irrigation.IrrigationSensingGoal(house.devices.irrigation_system))

agents.irrigation_agent.intentions.push(Irrigation.IrrigationControlIntention)
agents.irrigation_agent.postSubGoal(new Irrigation.IrrigationControlGoal(house.devices.irrigation_system, house.rooms.garden, house.utilities.weather))


// ------------------------lawn mower agents--------------------------------------------------------------------
{
    agents.lawn_mower1 = new Agent('lawn_mower1', { lawn_mower: house.devices.lawn_mower1 })

    agents.lawn_mower1.intentions.push(Person.SomeoneInRoomDetectionIntention)
    agents.lawn_mower1.postSubGoal(new Person.SomeoneInRoomDetectionGoal(house.people, [house.rooms.garden]))

    agents.lawn_mower1.intentions.push(LawnMower.LawnMowerSensingIntention)
    agents.lawn_mower1.postSubGoal(new LawnMower.LawnMowerSensingGoal(house.rooms.garden, house.utilities.weather))

    let { PlanningIntention } = require('../pddl/Blackbox')([LawnMower.Cut, LawnMower.Move])
    agents.lawn_mower1.intentions.push(PlanningIntention)
    agents.lawn_mower1.intentions.push(RetryIntention)

    // let lawn_mower_goal = house.rooms.garden.grass_areas.map(a => { return `not (tall-grass ${a})` })
    // agents.lawn_mower1.postSubGoal( new PlanningGoal( { goal: lawn_mower_goal } ) )
    // agents.lawn_mower1.postSubGoal(new RetryGoal({ goal: new PlanningGoal({ goal: lawn_mower_goal }) }))
}

{
    agents.lawn_mower2 = new Agent('lawn_mower2', { lawn_mower: house.devices.lawn_mower2 })

    agents.lawn_mower2.intentions.push(Person.SomeoneInRoomDetectionIntention)
    agents.lawn_mower2.postSubGoal(new Person.SomeoneInRoomDetectionGoal(house.people, [house.rooms.garden]))

    agents.lawn_mower2.intentions.push(LawnMower.LawnMowerSensingIntention)
    agents.lawn_mower2.postSubGoal(new LawnMower.LawnMowerSensingGoal(house.rooms.garden, house.utilities.weather))

    let { PlanningIntention } = require('../pddl/Blackbox')([LawnMower.Cut, LawnMower.Move])
    agents.lawn_mower2.intentions.push(PlanningIntention)
    agents.lawn_mower2.intentions.push(RetryIntention)

    // let lawn_mower_goal = house.rooms.garden.grass_areas.map(a => { return `not (tall-grass ${a})` })
    // agents.lawn_mower2.postSubGoal( new PlanningGoal( { goal: lawn_mower_goal } ) )
    // agents.lawn_mower2.postSubGoal(new RetryGoal({ goal: new PlanningGoal({ goal: lawn_mower_goal }) }))
}

// ------------------------vacuum cleaner agents--------------------------------------------------------------------
{
    agents.vacuum_cleaner1 = new Agent('vacuum_cleaner1', { vacuum_cleaner: house.devices.vacuum_cleaner1 })
    let rooms = [house.rooms.livingroom, house.rooms.kitchen, house.rooms.mainbathroom, house.rooms.garage]

    agents.vacuum_cleaner1.intentions.push(Room.RoomConnectionIntention)
    agents.vacuum_cleaner1.postSubGoal(new Room.RoomConnectionGoal(rooms))

    agents.vacuum_cleaner1.intentions.push(Person.SomeoneInRoomDetectionIntention)
    agents.vacuum_cleaner1.postSubGoal(new Person.SomeoneInRoomDetectionGoal(house.people, rooms))

    agents.vacuum_cleaner1.intentions.push(VacuumCleaner.VacuumSensingIntention)
    agents.vacuum_cleaner1.postSubGoal(new VacuumCleaner.VacuumSensingGoal(rooms, house.people))

    agents.vacuum_cleaner1.intentions.push(VacuumCleaner.Move, VacuumCleaner.Suck)
    agents.vacuum_cleaner1.intentions.push(MessageDispatcher.PostmanAcceptAllRequest)

    let { PlanningIntention } = require('../pddl/Blackbox')([VacuumCleaner.Suck, VacuumCleaner.Move])
    agents.vacuum_cleaner1.intentions.push(PlanningIntention)
    // let vacuum_cleaner_goal = rooms.map(r => { return `not (dirty ${r.name})`} ).concat([`at ${house.devices.vacuum_cleaner1.at}`])
    // agents.vacuum_cleaner1.postSubGoal( new PlanningGoal( { goal: vacuum_cleaner_goal } ) )

    agents.vacuum_cleaner1.postSubGoal(new MessageDispatcher.Postman())
}
{
    agents.vacuum_cleaner2 = new Agent('vacuum_cleaner2', { vacuum_cleaner: house.devices.vacuum_cleaner2 })
    let rooms = [house.rooms.bedroom2, house.rooms.bedroom3, house.rooms.secondarybathroom, house.rooms.corridor]

    agents.vacuum_cleaner2.intentions.push(Room.RoomConnectionIntention)
    agents.vacuum_cleaner2.postSubGoal(new Room.RoomConnectionGoal(rooms))

    agents.vacuum_cleaner2.intentions.push(Person.SomeoneInRoomDetectionIntention)
    agents.vacuum_cleaner2.postSubGoal(new Person.SomeoneInRoomDetectionGoal(house.people, rooms))

    agents.vacuum_cleaner2.intentions.push(VacuumCleaner.VacuumSensingIntention)
    agents.vacuum_cleaner2.postSubGoal(new VacuumCleaner.VacuumSensingGoal(rooms, house.people))

    agents.vacuum_cleaner2.intentions.push(VacuumCleaner.Move, VacuumCleaner.Suck)
    agents.vacuum_cleaner2.intentions.push(MessageDispatcher.PostmanAcceptAllRequest)

    let { PlanningIntention } = require('../pddl/Blackbox')([VacuumCleaner.Suck, VacuumCleaner.Move])
    agents.vacuum_cleaner2.intentions.push(PlanningIntention)
    // let vacuum_cleaner_goal = rooms.map(r => { return `not (dirty ${r.name})` }).concat([`at ${house.devices.vacuum_cleaner2.at}`])
    // agents.vacuum_cleaner2.postSubGoal(new PlanningGoal({ goal: vacuum_cleaner_goal }))

    agents.vacuum_cleaner2.postSubGoal(new MessageDispatcher.Postman())
}





// Daily schedule
Clock.global.observe('mm', (mm, key) => {
    var time = Clock.global
    if(time.dd == 0 && time.hh==7 && time.mm==0){ // TODO
        house.people.luca.is_sleeping = false
        agents.luca_agent.postSubGoal( new PlanningGoal( { goal: [`person_in_room ${house.people.luca.name} ${house.rooms.kitchen.name}`] } ) )
    } else if(time.dd == 0 && time.hh==20 && time.mm==0){
        agents.luca_agent.postSubGoal( new PlanningGoal( { goal: [`person_in_room ${house.people.luca.name} ${house.rooms.livingroom.name}`] } ) )
    } else if(time.dd == 0 && time.hh==23 && time.mm==0){
        agents.luca_agent.postSubGoal( new PlanningGoal( { goal: [`person_in_room ${house.people.luca.name} ${house.rooms.bedroom1.name}`] } ) )
    }

    if (time.hh == 8 && time.mm == 0)
        house.devices.solar_panels.activate()
    if (time.hh == 18 && time.mm == 0)
        house.devices.solar_panels.deactivate()

    if (time.dd == 0 && time.hh == 12 && time.mm == 0) { // TODO
        let rooms1 = [house.rooms.livingroom, house.rooms.mainbathroom, house.rooms.garage]
        agents.house_agent.intentions.push(House.HouseCleanIntention)
        agents.house_agent.postSubGoal(new House.HouseCleanGoal(rooms1, house.devices.vacuum_cleaner1, agents.vacuum_cleaner1.name))

        let rooms2 = [house.rooms.bedroom2, house.rooms.bedroom3, house.rooms.secondarybathroom, house.rooms.corridor]
        agents.house_agent.intentions.push(House.HouseCleanIntention)
        agents.house_agent.postSubGoal(new House.HouseCleanGoal(rooms2, house.devices.vacuum_cleaner2, agents.vacuum_cleaner2.name))
    }
    

    if (time.dd == 1 && time.hh == 16 && time.mm == 0) {
        let lawn_mower_goal = house.rooms.garden.grass_areas.map(a => { return `not (tall-grass ${a})` })
        agents.lawn_mower1.postSubGoal(new RetryGoal({ goal: new PlanningGoal({ goal: lawn_mower_goal }) }))
        agents.lawn_mower2.postSubGoal(new RetryGoal({ goal: new PlanningGoal({ goal: lawn_mower_goal }) }))
    }
})

Clock.startTimer()
