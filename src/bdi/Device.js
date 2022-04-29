const Observable =  require('../utils/Observable')
const Clock =  require('../utils/Clock')


class Logger {
    constructor(people, devices, energy_monitor){
        for (let [key, person] of Object.entries(people)) {
            person.observe('in_room', (v, k)=>console.log(person.name + ' in ' + v) )
        }

        for (let [key, device] of Object.entries(devices)) {
            if(device instanceof Light){
                device.observe('status', (status, k)=>console.log(device.name+': '+status))
            }
            if(device instanceof Shutter){
                device.observe('status', (status, k)=>console.log(device.name+': '+status))
            }
        }

        Clock.global.observe('dd', (dd, key) => {
            console.log("energy consumption:", energy_monitor.totalConsumption())
        })
    }
}


class EnergyConsumption {
    constructor(people, devices){
        this.devices = {}
        this.total_consumption = 0

        for (let [key, device] of Object.entries(devices)) {
            if(device instanceof Light || device instanceof SolarPanels){
                device.observe('status', (status, k)=>this.monitorDevice(device))
            }
        }
        
    }

    monitorDevice(device){
        
        let device_consumption = ('consumption' in device)?device.consumption:-device.production
        if(device.status == 'on' || device.status == 'active'){
            if(!(device.name in this.devices))
                this.devices[device.name]={consumption:device_consumption, start:Clock.getTime()}
        } else if(device.status == 'off' || device.status == 'inactive'){
            if(device.name in this.devices){
                let end = Clock.global
                this.total_consumption += device_consumption*this.elapsedHours(this.devices[device.name].start, end)
                delete this.devices[device.name]
            }
        }
    }

    elapsedHours(start, end){
        let start_totmm = start.dd*24*60 + start.hh*60 + start.mm
        let end_totmm = end.dd*24*60 + end.hh*60 + end.mm
        let diff_hh = (end_totmm - start_totmm)/60
        return diff_hh
    }

    totalConsumption(){
        let consumption = 0;
        for (let [key, device] of Object.entries(this.devices)) {
            let device_consumption = ('consumption' in device)?device.consumption:-device.production
            consumption += device_consumption*this.elapsedHours(device.start, Clock.getTime())
        }        
        return consumption + this.total_consumption
    }
}



class BrightnessSensor extends Observable {
    constructor(name, room){
        let init = {name:name, room: room, light_level: 'low'}
        super(init)
    }

    initialize(people, devices){} // do not observe any device or person

    // senseBrightness(){ // TODO
    //     return 'high'
    // }
}


class PresenceDetector extends Observable {
    constructor(name, room){
        let init = {name:name, room: room, people_presence: false}
        super(init)
        this.beliefSet = {people:{}}
    }

    initialize(people, devices){
        for (let [key, person] of Object.entries(people)) {
            person.observe('in_room', (room, k) => {
                if(room == this.room){
                    this.beliefSet.people[person.name] = person
                    this.people_presence = true
                } else if(person.name in this.beliefSet.people){
                    delete this.beliefSet.people[person.name]
                    if(Object.keys(this.beliefSet.people).length == 0)
                        this.people_presence = false
                }
            })
        }
    }

}


class Light extends Observable {
    constructor(name, room, consumption=10){
        let init = {name:name, room: room, status: 'off', consumption:consumption}
        super(init)
        this.beliefSet = {people_presence: undefined, light_level: undefined}
    }

    initialize(people, devices){
        for (let [key, device] of Object.entries(devices)) {
            if(device instanceof BrightnessSensor && device.room == this.room)
                device.observe('light_level', (level, k) => {
                    this.beliefSet.light_level = level
                    this.checkLight(this)
                })
            
            if(device instanceof PresenceDetector && device.room == this.room)
                device.observe('people_presence', (presence, k) => {
                    this.beliefSet.people_presence = presence
                    this.checkLight(this)
                })
        }

        if(this.room == 'garden'){
            Clock.global.observe('hh', (hh, key) => {
                if(hh >= 19 && hh <= 22){
                    if(this.status == 'off')
                        this.turnOn()
                } else {
                    if(this.status == 'on')    
                        this.turnOff()
                }
            })
        }

    }

    checkLight(light){
        if(light.beliefSet.people_presence && light.beliefSet.light_level == 'low'){
            if(light.status == 'off'){
                light.turnOn()
                // console.log('lights turned on in room ' + light.room)
            }
        } else if(light.status == 'on'){
            light.turnOff()
            // console.log('lights turned off in room ' + light.room)
        }
    }
    turnOn(){
        this.status = 'on'
    }
    turnOff(){
        this.status = 'off'
    }
}


class Shutter extends Observable {
    constructor(name, room){
        let init = {name:name, room: room, status: 'down'}
        super(init)
    }

    initialize(people, devices){
        Clock.global.observe('hh', (hh, key) => {
            if(hh <= 6 || hh >= 21){
                if(this.status == 'up')
                    this.goDown()
            } else {
                if(this.status == 'down')    
                    this.goUp()
            }
        })
    }

    goUp(){
        this.status = 'up'
    }
    goDown(){
        this.status = 'down'
    }
}


class GarageDoor extends Observable {
    constructor(name, room){
        let init = {name:name, room: room, status: 'closed'}
        super(init)
    }

    initialize(people, devices){
        Clock.global.observe('hh', (hh, key) => {
            if(hh >= 21){ // TODO: better logic
                if(this.status == 'opened')
                    this.close()
            }
        })
    }

    open(){
        this.status = 'opened'
    }
    close(){
        this.status = 'closed'
    }
}


class SolarPanels extends Observable {
    constructor(name){
        let init = {name:name, status: 'active', production: 5000}
        super(init)
    }

    initialize(people, devices){
        Clock.global.observe('hh', (hh, key) => {
            if(hh >= 8 && hh <= 17){
                if(this.status == 'inactive')
                    this.status = 'active'
            } else {
                if(this.status == 'active')    
                    this.status == 'inactive'
            }
        })
    }
}


module.exports = {
    Logger, 
    EnergyConsumption, 
    BrightnessSensor, 
    PresenceDetector, 
    Light, 
    Shutter, 
    GarageDoor,
    SolarPanels
}