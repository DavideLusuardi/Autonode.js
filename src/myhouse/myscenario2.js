const Beliefset =  require('../bdi/Beliefset')
const Observable =  require('../utils/Observable')
const Clock =  require('../utils/Clock')
const Agent = require('../bdi/Agent')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const devices = require('../bdi/devices')



class House {

    constructor () {

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
            bob: new Observable ( { 
                name: 'Bob', 
                in_room: this.rooms.kitchen.name 
            } ),
            // maria: new Observable ( { 
            //     name: 'Maria', 
            //     in_room: this.rooms.living_room.name 
            // } ),
        }

        // devices -------------------------------------------------------
        this.devices = {
            // car: new Observable({ charging: true })
        }
        for (let [key, room] of Object.entries(this.rooms)) {
            this.devices['lights@'+key] = new devices.Light('lights@'+key, room.name)
            this.devices['brightness_sensor@'+key] = new devices.BrightnessSensor('brightness_sensor@'+key, room.name)
            this.devices['presence_detector@'+key] = new devices.PresenceDetector('presence_detector@'+key, room.name)
        }
        this.devices['lights_TV@living_room'] = new devices.Light('lights_TV@living_room', this.rooms.living_room.name) // TODO: implementare quando si accendono
        
        let windows_in_rooms = {kitchen:2, living_room:2, garage:1, main_bathroom:1, garden:1, stairs_up:1, 
            bedroom1:2, bedroom2:1, bedroom3:1, secondary_bathroom:1, stairs_down:1, corridor:0}
        
        for (let [key, num_windows] of Object.entries(windows_in_rooms)){
            this.rooms[key].windows = num_windows
            for(let i=0; i<num_windows; i++)
                this.devices['shutter'+(i+1)+'@'+key] = new devices.Shutter('shutter'+(i+1)+'@'+key, this.rooms[key].name)
        }
        
        this.devices['garage_door'] = new devices.GarageDoor('garage_door', this.rooms.garage.name)
        this.devices['solar_panels'] = new devices.SolarPanels('solar_panels')
        let energy_monitor = new devices.EnergyConsumption(this.people, this.devices)

        for (let [key, device] of Object.entries(this.devices))
            device.initialize(this.people, this.devices)
        
        for (let [key, device] of Object.entries(this.devices))
            device.notifyAll() // refresh devices status
        
        // console.log(JSON.stringify(this.devices, null, 2))


        // ---------------------------------------------------------------
        let logger = new devices.Logger(this.people, this.devices, energy_monitor)

        Clock.startTimer()
        Clock.wallClock()
    }

    runScenario1(){
        // Daily schedule
        Clock.global.observe('mm', (mm, key) => {
            var time = Clock.global
            if(time.hh==1 && time.mm==0)
                house.people.bob.in_room = house.rooms.kitchen.name
            if(time.hh==2 && time.mm==30)
                house.people.bob.in_room = house.rooms.living_room.name
            if(time.hh==3 && time.mm==0)
                house.people.bob.in_room = house.rooms.main_bathroom.name
            if(time.hh==4 && time.mm==15)
                house.people.bob.in_room = house.rooms.living_room.name
        })



        var house_agent = new Agent('house_agent')

        class SetupAlarm extends Goal {}

        class MyAlarm extends Intention {
            static applicable(goal) {
                return goal instanceof SetupAlarm
            }   
            *exec () {
                while(true) {
                    yield Clock.global.notifyChange('mm')
                    if (Clock.global.hh == 6) {
                        console.log('ALARM, it\'s 6am!')
                        break;
                    }
                }
            }
        }

        house_agent.intentions.push(MyAlarm)

        house_agent.postSubGoal(new SetupAlarm({hh:6, mm:0}))
    }

}


var house = new House()
house.runScenario1()



// differenza agente e device
// logica intention viene da planner?
// quando intention non funziona?