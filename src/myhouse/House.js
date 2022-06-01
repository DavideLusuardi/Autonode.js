const Agent = require('../bdi/Agent')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Observable = require('../utils/Observable')
const Clock = require('../utils/Clock')
const PlanningGoal = require('../pddl/PlanningGoal')
const MessageDispatcher = require('../utils/MessageDispatcher')

const Room = require('./Room')
const Garden = require('./Garden')
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

/**
 * @class House
 * The house is composed of rooms, devices and utilities.
 */
class House {

    constructor() {

        this.utilities = {
            electricity: new Observable({ total_consumption: 0, current_consumption: 0 }),
            weather: new Observable({ is_raining: false, sun_present: true, last_day_has_rained: -2, raining_next24h: false }),
        }

        // rooms -------------------------------------------------------
        this.rooms = {
            kitchen: new Room.Room('kitchen', 0, [], true),
            livingroom: new Room.Room('livingroom', 0, [], true),
            garage: new Room.Room('garage', 0, [], true),
            mainbathroom: new Room.Room('mainbathroom', 0, [], true),
            stairs: new Room.Room('stairs', 0, [], true),

            bedroom1: new Room.Room('bedroom1', 1, [], true),
            bedroom2: new Room.Room('bedroom2', 1, [], true),
            bedroom3: new Room.Room('bedroom3', 1, [], true),
            secondarybathroom: new Room.Room('secondarybathroom', 1, [], true),
            corridor: new Room.Room('corridor', 1, [], true),
        }

        let grass_areas = ['a11', 'a12', 'a13', 'a14', 'a15', 'a25', 'a35', 'a43', 'a44', 'a45']
        let connected_areas = ['a11 a12', 'a12 a13', 'a13 a14', 'a14 a15', 'a12 a11', 'a13 a12', 'a14 a13', 'a15 a14', 'a15 a25', 'a25 a15', 'a25 a35', 'a35 a25', 'a35 a45', 'a45 a35', 'a43 a44', 'a44 a45', 'a44 a43', 'a45 a44']
        let grass_height = new Observable(grass_areas.reduce((accumulator, element, index) => { return { ...accumulator, [element]: 'tall' } }, {}))
        let ground_slope = { 'a11': 'high', 'a12': 'high', 'a13': 'high', 'a14': 'high', 'a15': 'high', 'a25': 'low', 'a35': 'low', 'a43': 'low', 'a44': 'low', 'a45': 'low' }
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

        // TODO: aggiungere altre persone
        // people -------------------------------------------------------
        this.people = {
            luca: new Person.Person(this, 'luca', this.rooms.bedroom1.name, true),
        }

        // devices -------------------------------------------------------
        this.devices = {}

        this.lights = {}
        for (let [key, room] of Object.entries(this.rooms)) {
            this.lights['light_' + room.name] = new Light.LightDevice('light_' + room.name, room, 10, this.utilities.electricity)
        }
        this.devices = Object.assign({}, this.devices, this.lights)

        this.devices['television'] = new Television.TelevisionDevice('television', this.rooms.livingroom, 50, this.utilities.electricity)
        this.devices['lights_TV'] = new Light.LightDevice('lights_TV', this.rooms.livingroom, 10, this.utilities.electricity)

        let windows_in_rooms = {
            kitchen: 2, livingroom: 2, garage: 1, mainbathroom: 1, garden: 1, stairs: 1,
            bedroom1: 2, bedroom2: 1, bedroom3: 1, secondarybathroom: 1, corridor: 0
        }

        this.shutters = {}
        for (let [key, num_windows] of Object.entries(windows_in_rooms)) {
            this.rooms[key].windows = num_windows
            for (let i = 0; i < num_windows; i++) {
                let shutter_name = 'shutter' + (num_windows > 1 ? (i + 1) : '') + '_' + key
                this.shutters[shutter_name] = new Shutter.ShutterDevice(shutter_name, this.rooms[key])
            }
        }
        this.devices = Object.assign({}, this.devices, this.shutters)

        this.devices['garage_door'] = new GarageDoor.GarageDoorDevice('garage_door', this.rooms.garage)
        this.devices['irrigation_system'] = new Irrigation.IrrigationSystem('irrigation_system', this.rooms.garden)
        this.devices['solar_panels'] = new SolarPanel.SolarPanelDevice('solar_panels', this.utilities.electricity)

        this.devices['lawn_mower1'] = new LawnMower.LawnMowerDevice('lawn_mower1', this.rooms.garden, 'a11')
        this.devices['lawn_mower2'] = new LawnMower.LawnMowerDevice('lawn_mower2', this.rooms.garden, 'a45')

        this.devices['vacuum_cleaner1'] = new VacuumCleaner.VacuumCleanerDevice('vacuum_cleaner1', this.rooms.livingroom, this.rooms)
        this.devices['vacuum_cleaner2'] = new VacuumCleaner.VacuumCleanerDevice('vacuum_cleaner2', this.rooms.secondarybathroom, this.rooms)
    }

}


/**
 * @class HouseCleanGoal
 */
class HouseCleanGoal extends Goal {
    constructor(rooms, vacuum_cleaner, vacuum_agent_name) {
        super()

        this.rooms = rooms
        this.vacuum_cleaner = vacuum_cleaner
        this.vacuum_agent_name = vacuum_agent_name
    }
}

/**
 * @class HouseCleanIntention
 * The house agent interacts with the vacuum cleaner in order to clean the rooms.
 */
class HouseCleanIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.rooms = this.goal.rooms
        this.vacuum_cleaner = this.goal.vacuum_cleaner
        this.vacuum_agent_name = this.goal.vacuum_agent_name
    }

    static applicable(goal) {
        return goal instanceof HouseCleanGoal
    }

    *exec() {
        let vacuum_cleaner_goal = this.rooms.map(r => { return `not (dirty ${r.name})` }).concat([`at ${this.vacuum_cleaner.at}`])
        yield MessageDispatcher.MessageDispatcher.authenticate(this.agent)
            .sendTo(this.vacuum_agent_name, new PlanningGoal({ goal: vacuum_cleaner_goal }))
    }

}


module.exports = { House, HouseCleanGoal, HouseCleanIntention }
