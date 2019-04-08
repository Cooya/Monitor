import chroma from 'chroma-js';
import React from 'react';
import { render } from 'react-dom';
import Select from 'react-select';
import Time from '@coya/time';

import 'bulma/css/bulma.css';

export class Monitor extends React.Component {
	constructor(props) {
		super(props);
		this.state = { focusedTab: 'logs', loading: true, entries: [] };
	}

	newRequest(entryType, filters) {
		// display loading spin
		this.setState((prevState, props) => {
			return { entries: [], loading: true, error: null };
		});

		const headers = new Headers();
		headers.append('Content-Type', 'application/json');

		const query = Object.assign({}, filters);
		query.maxEntries = parseInt(query.maxEntries);
		if (query.dateFrom)
			query.dateFrom =
				Time.dateToMilliseconds(query.dateFrom, 'ymd', '-') +
				(query.timeFrom ? Time.timeToMilliseconds(query.timeFrom) : 0);
		if (query.dateTo)
			query.dateTo =
				Time.dateToMilliseconds(query.dateTo, 'ymd', '-') +
				(query.timeTo ? Time.timeToMilliseconds(query.timeTo) : 0);

		fetch('/monitor/query', {
			method: 'POST',
			body: JSON.stringify({ entryType: entryType, filters: query }),
			headers: headers
		})
			.then(response => {
				if (!response.ok)
					this.setState((prevState, props) => {
						return {
							entries: [],
							loading: false,
							error: 'The request to the server has failed.'
						};
					});
				else
					response.json().then(result => {
						if (result.error)
							this.setState((prevState, props) => {
								return { entries: [], loading: false, error: result.error };
							});
						else {
							if (!result.entries.length)
								this.setState((prevState, props) => {
									return {
										entries: [],
										loading: false,
										error: 'No entry to display.'
									};
								});
							else {
								//setTimeout(() => {
								this.setState((prevState, props) => {
									return { entries: result.entries, loading: false, error: null };
								});
								//}, 3000);
							}
						}
					});
			})
			.catch(error => {
				this.setState((prevState, props) => {
					return { entries: [], loading: false, error: error.message };
				});
			});
	}

	changeTab(focusedTab) {
		if (focusedTab !== this.state.focusedTab) {
			this.setState((prevState, props) => {
				prevState.focusedTab = focusedTab;
				prevState.entries = [];
				return prevState;
			});
		}
	}

	// this method is called by the filters box every time the filters box is updated (or mounted)
	updateEntries(filters) {
		this.newRequest(this.state.focusedTab, filters);
	}

	render() {
		return (
			<div>
				<section className="hero is-dark is-bold">
					<div className="hero-body">
						<div className="has-text-centered">
							<h1 className="title is-1">Monitor</h1>
						</div>
					</div>
				</section>
				<section className="container">
					<div className="columns">
						<div className="column is-one-third">
							<FiltersBox
								entryType={this.state.focusedTab}
								onChange={this.updateEntries.bind(this)}
							/>
						</div>
						<div className="column is-two-thirds">
							<div className="tabs is-boxed">
								<ul>
									<li
										className={
											this.state.focusedTab === 'logs' ? 'is-active' : ''
										}
										onClick={this.changeTab.bind(this, 'logs')}
									>
										<a href="#logs">
											<span>Logs</span>
										</a>
									</li>
									<li
										className={
											this.state.focusedTab === 'logger' ? 'is-active' : ''
										}
										onClick={this.changeTab.bind(this, 'logger')}
									>
										<a href="#logger">
											<span>Logger</span>
										</a>
									</li>
									<li
										className={
											this.state.focusedTab === 'stats' ? 'is-active' : ''
										}
										onClick={this.changeTab.bind(this, 'stats')}
									>
										<a href="#stats">
											<span>Stats</span>
										</a>
									</li>
								</ul>
							</div>
							<div
								className={
									'spinner ' + (this.state.loading ? 'visible' : 'invisible')
								}
							>
								<div className="double-bounce1" />
								<div className="double-bounce2" />
							</div>
							<EntriesList
								entryType={this.state.focusedTab}
								entries={this.state.entries}
								error={this.state.error}
							/>
						</div>
					</div>
				</section>
			</div>
		);
	}
}

class FiltersBox extends React.Component {
	constructor(props) {
		super(props);

		this.levelFilters = [
			{ value: 'info', label: 'info', color: 'green' },
			{ value: 'notice', label: 'notice', color: 'blue' },
			{ value: 'warning', label: 'warning', color: 'orange' },
			{ value: 'error', label: 'error', color: 'red' },
			{ value: 'debug', label: 'debug', color: 'grey' }
		];

		this.initialState = {
			maxEntries: '100',
			collection: 'server',
			module: '',
			domainName: '',
			ipAddress: '',
			userAgent: '',
			referer: '',
			levels: this.levelFilters,
			dateFrom: Time.millisecondsToDate(Time.roundDateToDay() - Time.oneMonth, 'ymd', '-'),
			timeFrom: '00:00',
			dateTo: Time.millisecondsToDate(Time.roundDateToDay() + Time.oneDay, 'ymd', '-'),
			timeTo: '00:00'
		};

		this.state = this.initialState;
	}

	componentDidMount() {
		this.props.onChange(this.state);
	}

	componentDidUpdate() {
		this.props.onChange(this.state);
	}

	componentWillReceiveProps(nextProps) {
		if (this.props.entryType !== nextProps.entryType) {
			this.filtersChanged = true;
			this.setState((prevState, props) => {
				return this.initialState;
			});
		}
	}

	shouldComponentUpdate(nextProps, nextState) {
		if (this.filtersChanged) {
			this.filtersChanged = false;
			return true;
		}
		return false;
	}

	onInputSubmit(inputName, value) {
		this.filtersChanged = true;
		this.setState((prevState, props) => {
			prevState[inputName] = value;
			return prevState;
		});
	}

	onLevelsSelectChange(levels) {
		this.filtersChanged = true;
		this.setState((prevState, props) => {
			prevState.levels = levels;
			return prevState;
		});
	}

	onInputChange(inputName, event) {
		//console.log(inputName + ' -> ' + event.target.value);

		this.filtersChanged = true;
		const value = event.target.value;
		this.setState((prevState, props) => {
			prevState[inputName] = value;
			return prevState;
		});
	}

	render() {
		const dateAndTimeFilters = (
			<div>
				<div className="field">
					<label className="label">From</label>
					<div className="control">
						<input
							className="input"
							type="date"
							value={this.state.dateFrom}
							onChange={this.onInputChange.bind(this, 'dateFrom')}
						/>
					</div>
					<br />
					<div className="control">
						<input
							className="input"
							type="time"
							value={this.state.timeFrom}
							onChange={this.onInputChange.bind(this, 'timeFrom')}
						/>
					</div>
				</div>
				<div className="field">
					<label className="label">To</label>
					<div className="control">
						<input
							className="input"
							type="date"
							value={this.state.dateTo}
							onChange={this.onInputChange.bind(this, 'dateTo')}
						/>
					</div>
					<br />
					<div className="control">
						<input
							className="input"
							type="time"
							value={this.state.timeTo}
							onChange={this.onInputChange.bind(this, 'timeTo')}
						/>
					</div>
				</div>
			</div>
		);

		if (this.props.entryType === 'logs') {
			const collectionFilter = (
				<div style={{ marginBottom: '15px' }}>
					<label className="label">Collection</label>
					<div className="select">
						<select
							value={this.state.collection}
							onChange={this.onInputChange.bind(this, 'collection')}
						>
							<option value="server">Server</option>
							<option value="daemon">Daemon</option>
						</select>
					</div>
				</div>
			);

			const colorStyles = {
				control: styles => ({ ...styles, backgroundColor: 'white' }),
				option: (styles, { data, isDisabled, isFocused, isSelected }) => {
					const color = chroma(data.color);
					return {
						...styles,
						backgroundColor: isDisabled
							? null
							: isSelected
							? data.color
							: isFocused
							? color.alpha(0.1).css()
							: null,
						color: isDisabled
							? '#ccc'
							: isSelected
							? chroma.contrast(color, 'white') > 2
								? 'white'
								: 'black'
							: data.color,
						cursor: isDisabled ? 'not-allowed' : 'default'
					};
				},
				multiValue: (styles, { data }) => {
					return {
						...styles,
						backgroundColor: chroma(data.color)
							.alpha(0.1)
							.css()
					};
				},
				multiValueLabel: (styles, { data }) => ({
					...styles,
					color: data.color
				}),
				multiValueRemove: (styles, { data }) => ({
					...styles,
					color: data.color,
					':hover': {
						backgroundColor: data.color,
						color: 'white'
					}
				})
			};

			const levelsFilter = (
				<div>
					<label className="label">Logs levels</label>
					<Select
						name="levels-select"
						value={this.state.levels}
						isMulti
						onChange={this.onLevelsSelectChange.bind(this)}
						options={this.levelFilters}
						styles={colorStyles}
					/>
					<br />
				</div>
			);

			return (
				<div className="box" style={{ marginTop: '20px' }}>
					<h3 className="title is-3">Filters</h3>
					<TextInputFilter
						title="Number maximum of entries"
						value={this.state.maxEntries}
						onSubmit={this.onInputSubmit.bind(this, 'maxEntries')}
					/>
					{collectionFilter}
					<TextInputFilter
						title="Module"
						value={this.state.module}
						onSubmit={this.onInputSubmit.bind(this, 'module')}
					/>
					{levelsFilter}
					{dateAndTimeFilters}
				</div>
			);
		} else if (this.props.entryType === 'logger')
			return (
				<div className="box" style={{ marginTop: '20px' }}>
					<h3 className="title is-3">Filters</h3>
					<TextInputFilter
						title="Number maximum of entries"
						value={this.state.maxEntries}
						onSubmit={this.onInputSubmit.bind(this, 'maxEntries')}
					/>
					<TextInputFilter
						title="Domain name"
						value={this.state.domainName}
						onSubmit={this.onInputSubmit.bind(this, 'domainName')}
					/>
					<TextInputFilter
						title="IP address"
						value={this.state.ipAddress}
						onSubmit={this.onInputSubmit.bind(this, 'ipAddress')}
					/>
					<TextInputFilter
						title="User agent"
						value={this.state.userAgent}
						onSubmit={this.onInputSubmit.bind(this, 'userAgent')}
					/>
					<TextInputFilter
						title="Referer"
						value={this.state.referer}
						onSubmit={this.onInputSubmit.bind(this, 'referer')}
					/>
					{dateAndTimeFilters}
				</div>
			);
		else if (this.props.entryType === 'stats') {
			return (
				<div className="box" style={{ marginTop: '20px' }}>
					<h3 className="title is-3">Filters</h3>
					<TextInputFilter
						title="Number maximum of entries"
						value={this.state.maxEntries}
						onSubmit={this.onInputSubmit.bind(this, 'maxEntries')}
					/>
					{dateAndTimeFilters}
				</div>
			);
		} else return null;
	}
}

class TextInputFilter extends React.Component {
	constructor(props) {
		super(props);
		this.state = { value: props.value };
	}

	componentWillReceiveProps(nextProps) {
		this.setState((prevState, props) => {
			return { value: nextProps.value };
		});
	}

	handleChange(event) {
		const value = event.target.value;
		this.setState((prevState, props) => {
			return { value: value };
		});
	}

	handleSubmit() {
		this.props.onSubmit(this.state.value);
	}

	render() {
		return (
			<div style={{ marginBottom: '15px' }}>
				<label className="label">{this.props.title}</label>
				<div className="field has-addons">
					<div className="control">
						<input
							className="input"
							type="text"
							value={this.state.value}
							onChange={this.handleChange.bind(this)}
						/>
					</div>
					<div className="control">
						<button
							className="button is-info"
							onClick={this.handleSubmit.bind(this)}
						>
							Submit
						</button>
					</div>
				</div>
			</div>
		);
	}
}

class EntriesList extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		this.colorAssociations = {
			info: '#23d160',
			notice: '#3273dc',
			warning: '#ffdd57',
			error: '#ff3860',
			debug: 'whitesmoke'
		};
	}

	render() {
		if (this.props.error) return <Message content={this.props.error} />;
		else {
			let header = null;
			let entries = null;

			if (this.props.entryType === 'logs')
				entries = this.props.entries.map((entry, index) => {
					return (
						<tr
							style={{ backgroundColor: this.colorAssociations[entry.level] }}
							key={index}
						>
							<td>
								<b>{new Date(entry.date).toISOString().replace(/\..*Z/, '')}</b>
							</td>
							<td>
								<b>{entry.module}</b>
							</td>
							<td>{JSON.stringify(entry.content)}</td>
						</tr>
					);
				});
			else if (this.props.entryType === 'logger')
				entries = this.props.entries.map((entry, index) => {
					return (
						<tr style={{ backgroundColor: 'whitesmoke' }} key={index}>
							<td>
								<b>{new Date(entry.date).toISOString().replace(/\..*Z/, '')}</b>
							</td>
							<td>{entry.content.hostname}</td>
							<td>{entry.content.path}</td>
							<td>{entry.content.ip}</td>
							<td>{entry.content.user_agent}</td>
							<td>{entry.content.referer}</td>
						</tr>
					);
				});
			else if (this.props.entryType === 'stats' && this.props.entries.length) {
				header = (
					<thead>
						<tr>
							<th>Day</th>
							<th>Domain name</th>
							<th>Visitors</th>
							<th>Total requests</th>
							<th>Good requests</th>
							<th>Bad requests</th>
						</tr>
					</thead>
				);
				entries = this.props.entries.map((entry, index) => {
					return Object.keys(entry).map(key => {
						if (key === '_id' || key === 'date') return null;
						return (
							<tr style={{ backgroundColor: 'whitesmoke' }} key={index + '_' + key}>
								<td>
									<b>{new Date(entry.date).toISOString().replace(/T.*$/, '')}</b>
								</td>
								<td>{key.replace(/_/g, '.')}</td>
								<td>{entry[key].visitors}</td>
								<td>{entry[key].total_requests}</td>
								<td>
									{entry[key].total_requests - (entry[key].bad_requests || 0)}
								</td>
								<td>{entry[key].bad_requests || 0}</td>
							</tr>
						);
					});
				});
			}

			return (
				<table className="table">
					{header}
					<tbody>{entries}</tbody>
				</table>
			);
		}
	}
}

class Message extends React.Component {
	render() {
		return (
			<article
				className="message is-danger"
				style={{ marginTop: '20px', textAlign: 'center' }}
			>
				<div className="message-body">{this.props.content}</div>
			</article>
		);
	}
}

render(<Monitor />, document.getElementById('root'));
