import React from 'react';
import Time from '@coya/time';

import EntriesList from './EntriesList';
import FiltersBox from './FiltersBox';

class Monitor extends React.Component {
	constructor(props) {
		super(props);
		this.state = {focusedTab: 'logs', loading: true, entries: [], collections: []};
	}

	async newRequest(entryType, filters) {
		// display loading spin
		this.setState((prevState, props) => {
			return {entries: [], loading: true, error: null};
		});

		const headers = new Headers();
		headers.append('Content-Type', 'application/json');

		const query = Object.assign({}, filters);
		query.maxEntries = parseInt(query.maxEntries);
		if (query.dateFrom) query.dateFrom = Time.dateToMilliseconds(query.dateFrom, 'ymd', '-') + (query.timeFrom ? Time.timeToMilliseconds(query.timeFrom) : 0);
		if (query.dateTo) query.dateTo = Time.dateToMilliseconds(query.dateTo, 'ymd', '-') + (query.timeTo ? Time.timeToMilliseconds(query.timeTo) : 0);

		try {
			const response = await fetch('/monitor/query', {
				method: 'POST',
				body: JSON.stringify({entryType: entryType, filters: query}),
				headers
			});

			if (!response.ok)
				this.setState((prevState, props) => {
					return {
						entries: [],
						loading: false,
						error: 'The request to the server has failed.'
					};
				});
			else {
				const result = await response.json();
				if (result.error)
					this.setState((prevState, props) => {
						return {entries: [], loading: false, error: result.error};
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
							return {entries: result.entries, loading: false, error: null};
						});
						//}, 3000);
					}
				}
			}
		} catch (e) {
			this.setState((prevState, props) => {
				return {entries: [], loading: false, error: e.message};
			});
		}
	}

	changeTab(focusedTab) {
		if (focusedTab !== this.state.focusedTab)
			this.setState((prevState, props) => {
				return {focusedTab, entries: []};
			});
	}

	// this method is called by the filters box every time the filters box is updated (or mounted)
	updateEntries(filters) {
		this.newRequest(this.state.focusedTab, filters);
	}

	async componentDidMount() {
		const response = await fetch('/monitor/config', {
			method: 'GET'
		});

		if (!response.ok)
			this.setState((prevState, props) => {
				return {
					entries: [],
					loading: false,
					error: 'The server is unreachable.'
				};
			});
		else {
			const collections = (await response.json()).collections;
			this.setState((prevState, props) => {
				return {
					collections
				};
			});
		}
	}

	render() {
		return (
			<div>
				<section className='hero is-dark is-bold'>
					<div className='hero-body'>
						<div className='has-text-centered'>
							<h1 className='title is-1'>Monitor</h1>
						</div>
					</div>
				</section>
				<section className='container'>
					<div className='columns'>
						<div className='column is-one-third'>
							<FiltersBox collections={this.state.collections} entryType={this.state.focusedTab} onChange={this.updateEntries.bind(this)} />
						</div>
						<div className='column is-two-thirds'>
							<div className='tabs is-boxed'>
								<ul>
									<li className={this.state.focusedTab === 'logs' ? 'is-active' : ''} onClick={this.changeTab.bind(this, 'logs')}>
										<a href='#logs'>
											<span>Logs</span>
										</a>
									</li>
									<li className={this.state.focusedTab === 'logger' ? 'is-active' : ''} onClick={this.changeTab.bind(this, 'logger')}>
										<a href='#logger'>
											<span>Logger</span>
										</a>
									</li>
									<li className={this.state.focusedTab === 'stats' ? 'is-active' : ''} onClick={this.changeTab.bind(this, 'stats')}>
										<a href='#stats'>
											<span>Stats</span>
										</a>
									</li>
								</ul>
							</div>
							<div className={'spinner ' + (this.state.loading ? 'visible' : 'invisible')}>
								<div className='double-bounce1' />
								<div className='double-bounce2' />
							</div>
							<EntriesList entryType={this.state.focusedTab} entries={this.state.entries} error={this.state.error} />
						</div>
					</div>
				</section>
			</div>
		);
	}
}

export default Monitor;
