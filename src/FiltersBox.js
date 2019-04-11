import chroma from 'chroma-js';
import React from 'react';
import Select from 'react-select';
import Time from '@coya/time';

import TextInputFilter from './TextInputFilter';

class FiltersBox extends React.Component {
	constructor(props) {
		super(props);

		this.levelFilters = [
			{value: 'info', label: 'info', color: 'green'},
			{value: 'notice', label: 'notice', color: 'blue'},
			{value: 'warning', label: 'warning', color: 'orange'},
			{value: 'error', label: 'error', color: 'red'},
			{value: 'debug', label: 'debug', color: 'grey'}
		];

		this.initialState = {
			maxEntries: '100',
			collection: '',
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

	componentDidUpdate() {
		this.props.onChange(this.state);
	}

	componentWillReceiveProps(nextProps) {
		if (this.props.entryType !== nextProps.entryType) {
			this.filtersChanged = true;
			this.setState((prevState, props) => {
				return prevState;
			});
		}

		// as soon as the collections list is received, the first one is defined as default
		if (this.props.collections.length !== nextProps.collections.length)
			this.setState((prevState, props) => {
				return {collection: nextProps.collections[0]};
			});
	}

	shouldComponentUpdate(nextProps, nextState) {
		// the first config request returns the selectable collections
		if (nextProps.collections.length !== this.props.collections.length) return true;

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
				<div className='field'>
					<label className='label'>From</label>
					<div className='control'>
						<input className='input' type='date' value={this.state.dateFrom} onChange={this.onInputChange.bind(this, 'dateFrom')} />
					</div>
					<br />
					<div className='control'>
						<input className='input' type='time' value={this.state.timeFrom} onChange={this.onInputChange.bind(this, 'timeFrom')} />
					</div>
				</div>
				<div className='field'>
					<label className='label'>To</label>
					<div className='control'>
						<input className='input' type='date' value={this.state.dateTo} onChange={this.onInputChange.bind(this, 'dateTo')} />
					</div>
					<br />
					<div className='control'>
						<input className='input' type='time' value={this.state.timeTo} onChange={this.onInputChange.bind(this, 'timeTo')} />
					</div>
				</div>
			</div>
		);

		if (this.props.entryType === 'logs') {
			const collectionOptions = this.props.collections.map((v, i) => {
				return <option value={v} key={i}>{v}</option>;
			});
			const collectionFilter = (
				<div style={{marginBottom: '15px'}}>
					<label className='label'>Collection</label>
					<div className='select'>
						<select value={this.state.collection} onChange={this.onInputChange.bind(this, 'collection')}>
							{collectionOptions}
						</select>
					</div>
				</div>
			);

			const colorStyles = {
				control: (styles) => ({...styles, backgroundColor: 'white'}),
				option: (styles, {data, isDisabled, isFocused, isSelected}) => {
					const color = chroma(data.color);
					return {
						...styles,
						backgroundColor: isDisabled ? null : isSelected ? data.color : isFocused ? color.alpha(0.1).css() : null,
						color: isDisabled ? '#ccc' : isSelected ? (chroma.contrast(color, 'white') > 2 ? 'white' : 'black') : data.color,
						cursor: isDisabled ? 'not-allowed' : 'default'
					};
				},
				multiValue: (styles, {data}) => {
					return {
						...styles,
						backgroundColor: chroma(data.color)
							.alpha(0.1)
							.css()
					};
				},
				multiValueLabel: (styles, {data}) => ({
					...styles,
					color: data.color
				}),
				multiValueRemove: (styles, {data}) => ({
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
					<label className='label'>Logs levels</label>
					<Select
						name='levels-select'
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
				<div className='box' style={{marginTop: '20px'}}>
					<h3 className='title is-3'>Filters</h3>
					<TextInputFilter title='Number maximum of entries' value={this.state.maxEntries} onSubmit={this.onInputSubmit.bind(this, 'maxEntries')} />
					{collectionFilter}
					<TextInputFilter title='Module' value={this.state.module} onSubmit={this.onInputSubmit.bind(this, 'module')} />
					{levelsFilter}
					{dateAndTimeFilters}
				</div>
			);
		} else if (this.props.entryType === 'logger')
			return (
				<div className='box' style={{marginTop: '20px'}}>
					<h3 className='title is-3'>Filters</h3>
					<TextInputFilter title='Number maximum of entries' value={this.state.maxEntries} onSubmit={this.onInputSubmit.bind(this, 'maxEntries')} />
					<TextInputFilter title='Domain name' value={this.state.domainName} onSubmit={this.onInputSubmit.bind(this, 'domainName')} />
					<TextInputFilter title='IP address' value={this.state.ipAddress} onSubmit={this.onInputSubmit.bind(this, 'ipAddress')} />
					<TextInputFilter title='User agent' value={this.state.userAgent} onSubmit={this.onInputSubmit.bind(this, 'userAgent')} />
					<TextInputFilter title='Referer' value={this.state.referer} onSubmit={this.onInputSubmit.bind(this, 'referer')} />
					{dateAndTimeFilters}
				</div>
			);
		else if (this.props.entryType === 'stats') {
			return (
				<div className='box' style={{marginTop: '20px'}}>
					<h3 className='title is-3'>Filters</h3>
					<TextInputFilter title='Number maximum of entries' value={this.state.maxEntries} onSubmit={this.onInputSubmit.bind(this, 'maxEntries')} />
					{dateAndTimeFilters}
				</div>
			);
		} else return null;
	}
}

export default FiltersBox;
