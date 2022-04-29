const Beliefset =  require('../bdi/Beliefset')
const Observable =  require('../utils/Observable')
const Clock =  require('../utils/Clock')
const Agent = require('../bdi/Agent')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const {Person, PersonDetectionGoal, PersonDetectionIntention} = require('./Person')
const {BrightnessSensingGoal, BrightnessSensingIntention} = require('./BrightnessSensing')
const {LightDevice, LightControlGoal, LightControlIntention} = require('./Light')


class House {

    constructor () {

        // rooms -------------------------------------------------------
        this.rooms = {
            kitchen: { name: 'kitchen', floor: 0, doors_to:[]},
            living_room: { name: 'living_room', floor: 0, doors_to:[]},            
        }

        let doors_to = [
            [this.rooms.living_room, this.rooms.kitchen],
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
            bob: new Person(this, 'bob', this.rooms.living_room.name),
        }

        // devices -------------------------------------------------------
        this.devices = {}
        let lights = {}
        for (let [key, room] of Object.entries(this.rooms)) {
            lights['light_'+room.name] = new LightDevice('light_'+room.name, room, 10)
            // this.devices['brightness_sensor@'+key] = new Device.BrightnessSensor('brightness_sensor@'+key, room.name)
            // this.devices['presence_detector@'+key] = new Device.PresenceDetector('presence_detector@'+key, room.name)
        }
        // this.devices['lights_TV@living_room'] = new Device.Light('lights_TV@living_room', this.rooms.living_room.name) // TODO: implementare quando si accendono
        
        // let windows_in_rooms = {kitchen:2, living_room:2, garage:1, main_bathroom:1, garden:1, stairs_up:1, 
        //     bedroom1:2, bedroom2:1, bedroom3:1, secondary_bathroom:1, stairs_down:1, corridor:0}
        
        // for (let [key, num_windows] of Object.entries(windows_in_rooms)){
        //     this.rooms[key].windows = num_windows
        //     for(let i=0; i<num_windows; i++)
        //         this.devices['shutter'+(i+1)+'@'+key] = new Device.Shutter('shutter'+(i+1)+'@'+key, this.rooms[key].name)
        // }
        
        // this.devices['garage_door'] = new Device.GarageDoor('garage_door', this.rooms.garage.name)
        // this.devices['solar_panels'] = new Device.SolarPanels('solar_panels')
        // let energy_monitor = new Device.EnergyConsumption(this.people, this.devices)

        // for (let [key, device] of Object.entries(this.devices))
        //     device.initialize(this.people, this.devices)
        
        
        // console.log(JSON.stringify(this.devices, null, 2))


        // ---------------------------------------------------------------
        // let logger = new Device.Logger(this.people, this.devices, energy_monitor)


        this.agents = []
        this.agents.house_agent = new Agent('house_agent')

        this.agents.house_agent.intentions.push(PersonDetectionIntention)
        this.agents.house_agent.postSubGoal(new PersonDetectionGoal(this.people))

        // this.agents.house_agent.intentions.push(BrightnessSensingIntention)
        // this.agents.house_agent.postSubGoal(new BrightnessSensingGoal(this.rooms))

        // this.agents.house_agent.intentions.push(LightControlIntention)
        // this.agents.house_agent.postSubGoal(new LightControlGoal(lights, this.rooms, this.people))


        
        // for (let [key, light] of Object.entries(lights)){
        //     // console.log(light.name)
        //     light.notifyAll() // refresh devices status
        // }


        // TODO: fix notify all in order to update initial status
        // for (let [key, person] of Object.entries(this.people))
        //     person.notifyAll() // refresh person status



        Clock.startTimer()
    }

    runScenario1(){
        // Daily schedule
        Clock.global.observe('mm', (mm, key) => {
            var time = Clock.global
            if(time.hh==10 && time.mm==0)
                house.people.bob.moveTo(house.rooms.kitchen.name)
            // if(time.hh==20 && time.mm==30)
            //     house.people.bob.moveTo(house.rooms.living_room.name)
            // if(time.hh==3 && time.mm==0)
            //     house.people.bob.in_room = house.rooms.main_bathroom.name
            // if(time.hh==4 && time.mm==15)
            //     house.people.bob.in_room = house.rooms.living_room.name
        })


        // var house_agent = new Agent('house_agent')

        // class SetupAlarm extends Goal {}

        // class MyAlarm extends Intention {
        //     static applicable(goal) {
        //         return goal instanceof SetupAlarm
        //     }   
        //     *exec () {
        //         while(true) {
        //             yield Clock.global.notifyChange('mm')
        //             if (Clock.global.hh == 6) {
        //                 console.log('ALARM, it\'s 6am!')
        //                 break;
        //             }
        //         }
        //     }
        // }

        // house_agent.intentions.push(MyAlarm)

        // house_agent.postSubGoal(new SetupAlarm({hh:6, mm:0}))
    }

}


var house = new House()
house.runScenario1()



// differenza agente e device
// logica intention viene da planner?
// quando intention non funziona?