const Observable = require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')


/**
 * @class SolarPanelDevice
 * The status can be 'active' or 'inactive'.
 * When there is sun, the solar panels produce 2000 watt.
 */
class SolarPanelDevice extends Observable {
    constructor(name, electricity_utility) {
        let init = { name: name, status: 'inactive', production: 2000 }
        super(init)

        this.electricity_utility = electricity_utility
        this.consumption_callback = () => {
            let consumption = -this.production / (60 / Clock.getIncrement().mm) // calculate consumption every clock increment
            this.electricity_utility.total_consumption += consumption
        }
    }

    /**
     * Simulate the production of energy of the solar panel and update the energy production.
     */
    activate() {
        if (this.status == 'inactive') {
            this.status = 'active'
            this.electricity_utility.current_consumption -= this.production
            Clock.global.observe('mm', this.consumption_callback)
        }
    }

    /**
     * Simulate the zero production of energy.
     */
    deactivate() {
        if (this.status == 'active') {
            this.status = 'inactive'
            this.electricity_utility.current_consumption += this.production
            Clock.global.unobserve('mm', this.consumption_callback)
        }
    }

}


/**
 * @class SolarPanelMonitorGoal
 */
class SolarPanelMonitorGoal extends Goal {
    constructor(solar_panel) {
        super()

        this.solar_panel = solar_panel
    }
}

/**
 * @class SolarPanelMonitorIntention
 * Monitor the solar panel status.
 * Declare in the agent beliefset `solar_panel_active` when the solar panels are producing energy.
 */
class SolarPanelMonitorIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.solar_panel = this.goal.solar_panel
    }

    static applicable(goal) {
        return goal instanceof SolarPanelMonitorGoal
    }

    *exec() {
        this.agent.beliefs.declare(`solar_panel_active`, this.solar_panel.status == 'active') // set initial knowledge

        let promise = new Promise(async res => {
            while (true) {
                let status = await this.solar_panel.notifyChange('status')
                this.agent.beliefs.declare(`solar_panel_active`, status == 'active')
                this.log(`solar_panel ${status}`)
            }
        });

        yield Promise.all([promise])
    }
}

module.exports = { SolarPanelDevice, SolarPanelMonitorGoal, SolarPanelMonitorIntention }