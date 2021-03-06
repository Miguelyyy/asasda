const gstate = {
	elems: [/*{
		name: "CORE",
		orders: [
			{
				idx: 1,
				count: 5,
				done: 5
			},
			{
				idx: 2,
				count: 15,
				done: 12
			}
		]
	}, {
		name: "BEFORE_MAP_LOADED",
		orders: [
			{
				idx: 1,
				count: 3,
				done: 3
			},
			{
				idx: 2,
				count: 25,
				done: 9
			}
		]
	}, {
		name: "AFTER_MAP_LOADED",
		orders: [
			{
				idx: 1,
				count: 10,
				done: 10
			},
			{
				idx: 2,
				count: 25,
				done: 9
			}
		]
	}, {
		name: "SESSION",
		orders: [
			{
				idx: 1,
				count: 100,
				done: 20
			}
		]
	}*/],
	log: []
};

const cfg = {
	elemWidth: 6,

	getElemWidth(type, value)
	{
		if (type.name == 'MAP')
		{
			return (600 / value.count);
		}

		return 6;
	},

	hues: {
		CORE: 120,
		BEFORE_MAP_LOADED: 40,
		AFTER_MAP_LOADED: 210,
		SESSION: 330,
		MAP: 150
	},

	pickColor(type, idx, off)
	{
		const scheme = new ColorScheme;
		scheme.from_hue(cfg.hues[type.name.replace(/INIT_/, '')])
			  .scheme('analogic')
			  .add_complement(true)
			  .distance(0.5)
			  .variation((off > 0) ? 'pastel' : 'default');

		const clr = scheme.colors()[((idx - 1) * 4) + off];

		return '#' + clr;
	}
};

const globalStateUpdateCallbacks = [];

const doInit = () =>
{
	globalStateUpdateCallbacks.map(cb => cb());
};

const printLog = (type, str) =>
{
	gstate.log.push({ type: type, str: str });
};

Array.prototype.last = function()
{
	return this[this.length - 1];
};

const handlers = {
	startInitFunction(data)
	{
	    gstate.elems.push({
	    	name: data.type,
	    	orders: []
	    });

	    printLog(1, `Running ${data.type} init functions`);

	    doInit();
	},

	startInitFunctionOrder(data)
	{
	    gstate.elems.filter(a => a.name == data.type).map(a => a.orders.push({
	    	idx: data.order,
	    	count: data.count,
	    	done: 0
	    }));

	    gstate.orderCount = data.count;

	    printLog(2, `Running functions of order ${data.order} (${data.count} total)`);

	    doInit();
	},

	initFunctionInvoking(data)
	{
		printLog(3, `Invoking ${data.name} ${data.type} init (${data.idx} of ${gstate.orderCount})`);

	    doInit();
	},

	initFunctionInvoked(data)
	{
		gstate.elems.filter(a => a.name == data.type).map(a => a.orders.last().done++);

	    doInit();
	},

	endInitFunction(data)
	{
		printLog(1, `Done running ${data.type} init functions`);

	    doInit();
	},

	startDataFileEntries(data)
	{
		gstate.elems.push({
	    	name: 'MAP',
	    	orders: [
	    	{
	    		idx: 1,
	    		count: data.count,
	    		done: 0
	    	}]
	    });

	    printLog(1, `Loading map`);

	    doInit();
	},

	performMapLoadFunction(data)
	{
		gstate.elems.filter(a => a.name == 'MAP').map(a => a.orders.last().done++);
		doInit();
	},

	onDataFileEntry(data)
	{
		/*if (data.isNew)
		{
			gstate.elems.filter(a => a.name == 'MAP').map(a => a.orders.last().done++);
		}*/

	    printLog(3, `Loading ${data.name}`);

	    doInit();
	},

	endDataFileEntries()
	{
		gstate.elems.filter(a => a.name == 'MAP').map(a => a.orders.last().done = a.orders.last().count);

	    printLog(1, `Done loading map`);

	    doInit();
	},

	onLogLine(data)
	{
		printLog(3, data.message);

		doInit();
	}
};

class ProgressOrder extends preact.Component
{
	render(props)
	{
		const value = props.value;
		const type = props.type;

		return (
			<dd class={ (value.done == value.count) ? 'done' : 'not-done' } style={ { width: (value.count * cfg.getElemWidth(type, value)) + 'px' } }>
				<i style={ { backgroundColor: cfg.pickColor(type, value.idx, 1) } }></i>
				<span style={ { width: (value.done * cfg.getElemWidth(type, value)) + 'px', backgroundColor: cfg.pickColor(type, value.idx, 0) } }></span>
			</dd>
		);
	}
}

class ProgressType extends preact.Component
{
	render(props)
	{
		return (
			<li>
				<dl class={'orders-' + props.value.name.replace(/INIT_/, '').toLowerCase()}>
					<dt>
						{props.value.name.replace(/INIT_/, '').replace(/_LOADED/, '')}
					</dt>
					{
						props.value.orders.map(order => <ProgressOrder type={props.value} value={order} />)
					}
				</dl>
			</li>);
	}
}

class LogEntry extends preact.Component
{
	render(props)
	{
		return <li class={'log-' + props.value.type}>{props.value.str}</li>;
	}
}

class Root extends preact.Component
{
	constructor()
	{
		super();
	}

	componentDidMount() {
		globalStateUpdateCallbacks.push(() => this.forceUpdate());
	}


	render(props, state)
	{
		return (
			<div>
				<ul class="progressList">
					{
						gstate.elems.map(elem => <ProgressType value={elem} />)
					}
				</ul>
				<ul class="log">
					{
						gstate.log.slice(-20).map(elem => <LogEntry value={elem} />)
					}
					<li></li>
				</ul>
			</div>
		);
	}
}

const update = function()
{
	preact.render(<Root />, document.querySelector('#root'));
}

window.addEventListener('message', function(e)
{
	(handlers[e.data.eventName] || function() {})(e.data);
});

const w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0)
const h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0)

const zoomPercent = ((h / 720) * 100) + '%';

document.body.style.zoom = zoomPercent;

update();

if (!window.invokeNative)
{
	const newType = name => () => handlers.startInitFunction({type: name});
	const newOrder = (name, idx, count) => () => handlers.startInitFunctionOrder({type: name, order: idx, count });
	const newInvoke = (name, func) => () => { handlers.initFunctionInvoking({ type: name, name: func, idx: 0 }); handlers.initFunctionInvoked({ type: name }); };
	const startEntries = (count) => () => handlers.startDataFileEntries({ count });
	const addEntry = () => () => handlers.onDataFileEntry({ name: 'meow', isNew: true });
	const stopEntries = () => () => handlers.endDataFileEntries({});

	const newTypeWithOrder = (name, count) => () => { newType(name)(); newOrder(name, 1, count)(); };

	const demoFuncs = [
		newTypeWithOrder('INIT_CORE', 5),
		newInvoke('INIT_CORE', 'meow1'),
		newInvoke('INIT_CORE', 'meow2'),
		newInvoke('INIT_CORE', 'meow3'),
		newInvoke('INIT_CORE', 'meow4'),
		newInvoke('INIT_CORE', 'meow5'),
		newOrder('INIT_CORE', 2, 2),
		newInvoke('INIT_CORE', 'meow1'),
		newInvoke('INIT_CORE', 'meow2'),
		startEntries(6),
		addEntry(),
		addEntry(),
		addEntry(),
		addEntry(),
		addEntry(),
		addEntry(),
		stopEntries(),
		newTypeWithOrder('INIT_SESSION', 4),
		newInvoke('INIT_SESSION', 'meow1'),
		newInvoke('INIT_SESSION', 'meow2'),
		newInvoke('INIT_SESSION', 'meow3'),
		newInvoke('INIT_SESSION', 'meow4'),
	];

	setInterval(() =>
	{
		demoFuncs.length && demoFuncs.shift()();
	}, 350);
}

/** @jsx preact.h */